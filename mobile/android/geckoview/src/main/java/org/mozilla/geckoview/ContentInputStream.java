/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.geckoview;

import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ProviderInfo;
import android.content.res.AssetFileDescriptor;
import android.net.Uri;
import android.os.Process;
import android.util.Log;
import androidx.annotation.AnyThread;
import androidx.annotation.NonNull;
import java.io.IOException;
import org.mozilla.gecko.GeckoAppShell;
import org.mozilla.gecko.annotation.WrapForJNI;

/**
 * This class provides an {@link OutputStream} wrapper for a Gecko nsIOutputStream (or really,
 * nsIRequest).
 */
/* package */ class ContentInputStream extends GeckoViewInputStream {
  private static final String LOGTAG = "ContentInputStream";

  private static final byte[][] HEADERS = {{'%', 'P', 'D', 'F', '-'}};

  private static final String[] ALLOWED_AUTHORITIES = {"com.google"};

  private AssetFileDescriptor mFd;

  ContentInputStream(final @NonNull String aUri) {
    final Uri uri = Uri.parse(aUri);
    final Context context = GeckoAppShell.getApplicationContext();
    final ContentResolver cr = context.getContentResolver();

    try {
      mFd = cr.openAssetFileDescriptor(uri, "r");
      setInputStream(mFd.createInputStream());

      if (!checkHeaders(HEADERS)) {
        Log.e(LOGTAG, "Cannot open the uri: " + aUri + " (invalid header)");
        close();
      }
    } catch (final IOException | SecurityException e) {
      Log.e(LOGTAG, "Cannot open the uri: " + aUri, e);
      close();
    }
  }

  @Override
  public void close() {
    if (mFd != null) {
      try {
        mFd.close();
      } catch (final IOException e) {
        Log.e(LOGTAG, "Cannot close the file descriptor", e);
      } finally {
        mFd = null;
      }
    }
    super.close();
  }

  private static boolean isExported(final @NonNull Context aCtx, final @NonNull Uri aUri) {
    // For reference:
    //   https://developer.android.com/topic/security/risks/content-resolver#mitigations_2
    final String authority = aUri.getAuthority();
    final PackageManager packageManager = aCtx.getPackageManager();
    if (authority == null || packageManager == null) {
      return false;
    }
    final ProviderInfo info = packageManager.resolveContentProvider(authority, 0);
    if (info == null) {
      return false;
    }

    // We check that the provider is exported:
    //   https://developer.android.com/reference/android/content/pm/ComponentInfo?hl=en#exported
    return info.exported;
  }

  private static boolean isInAllowList(final @NonNull Context aCtx, final @NonNull Uri aUri) {
    // For reference:
    //   https://developer.android.com/topic/security/risks/content-resolver#mitigations_2
    final String authority = aUri.getAuthority();
    final PackageManager packageManager = aCtx.getPackageManager();
    if (authority == null || packageManager == null) {
      return false;
    }
    // Make sure we've a provider for this authority.
    final ProviderInfo info = packageManager.resolveContentProvider(authority, 0);
    if (info == null) {
      return false;
    }

    for (final String allowedAuthority : ALLOWED_AUTHORITIES) {
      if (info.authority.startsWith(allowedAuthority)) {
        return true;
      }
    }

    Log.d(LOGTAG, "The authority isn't in the allow list: " + info.authority);
    return false;
  }

  private static boolean wasGrantedPermission(
      final @NonNull Context aCtx, final @NonNull Uri aUri) {
    // For reference:
    //   https://developer.android.com/topic/security/risks/content-resolver#mitigations_2
    final int pid = Process.myPid();
    final int uid = Process.myUid();
    return aCtx.checkUriPermission(aUri, pid, uid, Intent.FLAG_GRANT_READ_URI_PERMISSION)
        == PackageManager.PERMISSION_GRANTED;
  }

  private static boolean belongsToCurrentApplication(
      final @NonNull Context aCtx, final @NonNull Uri aUri) {
    // For reference:
    //   https://developer.android.com/topic/security/risks/content-resolver#mitigations_2
    final String authority = aUri.getAuthority();
    final PackageManager packageManager = aCtx.getPackageManager();
    if (authority == null || packageManager == null) {
      return false;
    }
    final ProviderInfo info = packageManager.resolveContentProvider(authority, 0);
    if (info == null) {
      return false;
    }

    // We check that the provider is GV itself (when testing GV, the provider is GV itself).
    final String packageName = aCtx.getPackageName();
    return packageName != null && packageName.equals(info.packageName);
  }

  @WrapForJNI
  @AnyThread
  private static boolean isReadable(final @NonNull String aUri) {
    final Uri uri = Uri.parse(aUri);
    final Context context = GeckoAppShell.getApplicationContext();

    try {
      if ((isExported(context, uri) || isInAllowList(context, uri))
              && wasGrantedPermission(context, uri)
          || belongsToCurrentApplication(context, uri)) {
        final ContentResolver cr = context.getContentResolver();
        cr.openAssetFileDescriptor(uri, "r").close();
        Log.d(LOGTAG, "The uri is readable: " + uri);
        return true;
      }
    } catch (final IOException | SecurityException e) {
      // A SecurityException could happen if the uri is no more valid or if
      // we're in an isolated process.
      Log.e(LOGTAG, "Cannot read the uri: " + uri, e);
    }

    Log.d(LOGTAG, "The uri isn't readable: " + uri);
    return false;
  }

  @WrapForJNI
  @AnyThread
  private static @NonNull GeckoViewInputStream getInstance(final @NonNull String aUri) {
    return new ContentInputStream(aUri);
  }
}
