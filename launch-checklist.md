# Pik Flyer Launch Checklist

Status date: 2026-07-18

## Done

- Android-first landing page is built.
- Temporary construction notes were removed from the public homepage.
- Real-photo landmark slideshow is visible in the first viewport.
- Static production wrapper builds successfully for Sites hosting.
- Privacy, Terms, and Refund pages exist and are linked.
- Customer support email is consistent: support@pikflyer.app.
- Pricing copy is set to US$4.99/month with a 5-day free trial.
- Free daily limits are documented: 20 teleport, 30 dice, 3 city walk.

## Must Finish Before Charging Users

- Produce a release-signed Android APK, not a debug APK.
- Put the APK at `public/downloads/pikflyer-android-free.apk`.
- Add public version number, release date, file size, and SHA-256 checksum to the download section.
- Create a Creem subscription product for US$4.99/month.
- Enable Creem license keys for the subscription product.
- Add the Creem checkout URL to the homepage.
- Add or verify the app-side license activation flow.
- Verify trial limits reset safely per day and cannot be bypassed by basic app restarts.
- Verify paid license unlocks unlimited or subscribed features.
- Verify cancellation and expired subscription states downgrade correctly.
- Run Android release install test on a real device.
- Check logcat for FATAL EXCEPTION, SecurityException, unknown path, not_implemented, and failed fetch.
- Publish the website publicly only after the APK and checkout flow are real.

## Recommended Immediately After Launch

- Add a custom domain.
- Add a short install video or GIF for APK sideloading.
- Add analytics for download click, checkout click, and install-guide clicks.
- Add a manual support/refund response template.
- Add a changelog page.
- Prepare a low-risk Google Play companion page later; do not use it as the first paid distribution path.
