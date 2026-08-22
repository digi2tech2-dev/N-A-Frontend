package online.nahub.app;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.URLUtil;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // WebView does not enqueue downloads by itself. Use Android's DownloadManager
        // and forward the current cookies so authenticated downloads keep working.
        bridge.getWebView().setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            try {
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                String fileName = URLUtil.guessFileName(url, contentDisposition, mimeType);
                String cookies = CookieManager.getInstance().getCookie(url);

                request.setTitle(fileName);
                request.setDescription(getString(R.string.download_description));
                request.setMimeType(mimeType);
                request.setNotificationVisibility(
                    DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
                );

                if (cookies != null && !cookies.isEmpty()) {
                    request.addRequestHeader("Cookie", cookies);
                }
                if (userAgent != null && !userAgent.isEmpty()) {
                    request.addRequestHeader("User-Agent", userAgent);
                }
                String referer = bridge.getWebView().getUrl();
                if (referer != null && !referer.isEmpty()) {
                    request.addRequestHeader("Referer", referer);
                }

                // Android 10+ can write to public Downloads without legacy storage access.
                // Older supported versions use DownloadManager's private download cache.
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    request.setDestinationInExternalPublicDir("Download", fileName);
                }

                DownloadManager manager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                manager.enqueue(request);
                Toast.makeText(this, R.string.download_started, Toast.LENGTH_SHORT).show();
            } catch (Exception error) {
                Toast.makeText(this, R.string.download_failed, Toast.LENGTH_LONG).show();
            }
        });
    }
}
