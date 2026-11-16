package expo.modules.appdiscovery

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.content.Intent
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream
import java.util.Locale

class AppDiscoveryModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AppDiscovery")

    AsyncFunction("isDeviceOwner") {
      val context = appContext.reactContext
        ?: throw IllegalStateException("Application context is unavailable")
      devicePolicyManager(context).isDeviceOwnerApp(context.packageName)
    }

    AsyncFunction("applyBlockedApps") { blockedPackages: List<String> ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("Application context is unavailable")
      val policyManager = devicePolicyManager(context)
      if (!policyManager.isDeviceOwnerApp(context.packageName)) {
        throw IllegalStateException("DEVICE_OWNER_REQUIRED")
      }

      val admin = ComponentName(context, AppDeviceAdminReceiver::class.java)
      val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      val managedPackages = preferences.getStringSet(MANAGED_PACKAGES_KEY, emptySet())?.toMutableSet() ?: mutableSetOf()
      val requestedPackages = blockedPackages.toSet() - context.packageName

      (managedPackages - requestedPackages).forEach { packageName ->
        if (!policyManager.setApplicationHidden(admin, packageName, false)) {
          throw IllegalStateException("Could not restore access to $packageName")
        }
        managedPackages.remove(packageName)
        persistManagedPackages(preferences, managedPackages)
      }

      requestedPackages.forEach { packageName ->
        val applicationInfo = try {
          context.packageManager.getApplicationInfo(packageName, 0)
        } catch (_: PackageManager.NameNotFoundException) {
          throw IllegalArgumentException("Application $packageName is no longer installed")
        }
        val isSystemApp =
          applicationInfo.flags and (ApplicationInfo.FLAG_SYSTEM or ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0
        if (isSystemApp) throw IllegalArgumentException("System applications cannot be restricted by Nest")

        if (!managedPackages.contains(packageName)) {
          if (!policyManager.setApplicationHidden(admin, packageName, true)) {
            throw IllegalStateException("Could not restrict $packageName")
          }
          managedPackages.add(packageName)
          persistManagedPackages(preferences, managedPackages)
        }
      }
    }

    AsyncFunction("getInstalledApps") {
      val context = appContext.reactContext
        ?: throw IllegalStateException("Application context is unavailable")
      val packageManager = context.packageManager
      val launchIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)

      packageManager.queryIntentActivities(launchIntent, 0)
        .asSequence()
        .mapNotNull { result ->
          val activityInfo = result.activityInfo ?: return@mapNotNull null
          val packageName = activityInfo.packageName
          if (packageName == context.packageName) return@mapNotNull null

          val applicationInfo = activityInfo.applicationInfo
          val label = packageManager.getApplicationLabel(applicationInfo).toString().trim()
          if (label.isEmpty()) return@mapNotNull null

          mapOf<String, Any?>(
            "id" to packageName,
            "name" to label,
            "iconUri" to iconDataUri(packageManager, applicationInfo),
            "isSystemApp" to ((applicationInfo.flags and (ApplicationInfo.FLAG_SYSTEM or ApplicationInfo.FLAG_UPDATED_SYSTEM_APP)) != 0)
          )
        }
        .distinctBy { it["id"] }
        .sortedBy { it["name"]?.toString()?.lowercase(Locale.ROOT) }
        .toList()
    }
  }

  private fun devicePolicyManager(context: Context): DevicePolicyManager =
    context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager

  private fun persistManagedPackages(
    preferences: android.content.SharedPreferences,
    packageNames: Set<String>
  ) {
    if (!preferences.edit().putStringSet(MANAGED_PACKAGES_KEY, packageNames.toSet()).commit()) {
      throw IllegalStateException("Could not save the managed application list")
    }
  }

  private fun iconDataUri(packageManager: PackageManager, applicationInfo: ApplicationInfo): String? {
    val bitmap = Bitmap.createBitmap(72, 72, Bitmap.Config.ARGB_8888)
    return try {
      val drawable = packageManager.getApplicationIcon(applicationInfo)
      drawable.setBounds(0, 0, bitmap.width, bitmap.height)
      drawable.draw(Canvas(bitmap))

      val bytes = ByteArrayOutputStream().use { output ->
        if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)) return null
        output.toByteArray()
      }
      "data:image/png;base64,${Base64.encodeToString(bytes, Base64.NO_WRAP)}"
    } catch (_: PackageManager.NameNotFoundException) {
      null
    } finally {
      bitmap.recycle()
    }
  }

  private companion object {
    const val PREFERENCES_NAME = "nest_device_policy"
    const val MANAGED_PACKAGES_KEY = "hidden_app_packages"
  }
}
