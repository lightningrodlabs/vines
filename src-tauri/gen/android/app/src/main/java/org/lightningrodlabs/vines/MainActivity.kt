package org.lightningrodlabs.vines

import android.os.Bundle
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

class MainActivity : TauriActivity() {
    //private var isAppReady = false

    override fun onCreate(savedInstanceState: Bundle?) {
        // MUST be called before super.onCreate()
        val splashScreen = installSplashScreen()
        // splashScreen.setKeepOnScreenCondition { !isAppReady }
        super.onCreate(savedInstanceState)
    }

    // override fun onWebViewCreate(webView: android.webkit.WebView) {
    //    super.onWebViewCreate(webView)
    //    webView.webViewClient = object : android.webkit.WebViewClient() {
    //        override fun onPageFinished(view: android.webkit.WebView?, url: String?) {
    //            isAppReady = true
    //        }
    //    }
    //}
}
