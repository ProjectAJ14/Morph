# Configure signed releases and automatic updates

Morph is currently distributed through GitHub Releases. This setup uses Apple
Developer ID signing and notarization for direct downloads. It does not submit
Morph to the Mac App Store.

## 1. Confirm your membership and Team ID

Sign in at https://developer.apple.com/account/. Confirm your Apple Developer
Program membership is active and accept any outstanding agreements.
Open **Membership details**, copy the **Team ID**, and keep it for `APPLE_TEAM_ID`.
Use the Apple account email for this membership as `APPLE_ID`.

Source: https://developer.apple.com/help/glossary/team-id/

## 2. Create a certificate signing request on your Mac

1. Open **Keychain Access** using Spotlight.
2. Select **Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority**.
3. Enter your Apple account email in **User Email Address**.
4. Enter a recognizable **Common Name**, such as `Morph Release Signing`.
5. Leave **CA Email Address** blank.
6. Select **Saved to disk**, click **Continue**, and save the `.certSigningRequest`
   outside the Morph repository.

Source: https://developer.apple.com/help/account/certificates/create-a-certificate-signing-request

## 3. Create a Developer ID Application certificate

1. In your Apple developer account, open **Certificates, Identifiers & Profiles → Certificates**.
2. Click **+** and choose **Developer ID Application** under the Developer ID options.
3. Follow the portal instructions and upload the CSR from step 2.
4. Download the `.cer` certificate and double-click it to import it into Keychain Access
   on the same Mac where you created the CSR.
5. Under **login → My Certificates**, find `Developer ID Application: Your Name (TEAMID)`.
   Expand it and confirm that a private key appears beneath it.

The account holder can create this certificate. An existing valid Developer ID
Application certificate with its private key can be reused; you do not need to
create another certificate for every release.

Source: https://developer.apple.com/help/account/certificates/create-developer-id-certificates

## 4. Export the certificate and private key

1. Select the certificate in **My Certificates** and choose **File → Export Items**
   (or right-click and choose **Export**).
2. Select **Personal Information Exchange (.p12)** and save it as `Morph-Developer-ID.p12`
   outside the repository, for example in Downloads.
3. Set a strong, nonempty export password and save it in your password manager.
   This becomes `CSC_KEY_PASSWORD`. macOS may ask for your login/keychain password
   separately to authorize the export.
4. If `.p12` is unavailable, confirm you selected the certificate with its private
   key on the Mac that generated the CSR. A `.cer` alone is insufficient.
5. Copy a base64 encoding of the export directly to the clipboard:

   ```sh
   base64 -i "$HOME/Downloads/Morph-Developer-ID.p12" | tr -d '\n' | pbcopy
   ```

   Adjust the path if you saved it elsewhere. Paste the clipboard into the
   `CSC_LINK` GitHub secret in step 6. This command does not print the certificate.

Keep the `.p12` and export password private and store a secure backup.

## 5. Generate an Apple app-specific password

1. Sign in at https://account.apple.com/ using the same Apple account.
2. Open **Sign-In and Security → App-Specific Passwords**.
3. Choose **Generate an app-specific password** and label it `Morph GitHub Notarization`.
4. Save the generated value as `APPLE_APP_SPECIFIC_PASSWORD` in GitHub.

Two-factor authentication must be enabled. Use the generated password, not your
normal Apple account password. Changing your primary Apple password revokes
app-specific passwords, so update the GitHub secret if that happens.

Source: https://support.apple.com/en-us/102654

## 6. Add GitHub Actions repository secrets

Open https://github.com/ProjectAJ14/Morph/settings/secrets/actions.
For each row below, click **New repository secret**, enter the exact name, paste
its value, and click **Add secret**.

| Name | Value |
| --- | --- |
| `CSC_LINK` | Single-line base64 encoding of the `.p12` certificate and private key |
| `CSC_KEY_PASSWORD` | Password you chose when exporting the `.p12` |
| `APPLE_ID` | Apple account email used for notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | Generated app-specific password from step 5 |
| `APPLE_TEAM_ID` | Team ID from Membership details |

Use repository **Secrets**, not Variables. Do not paste credentials into chat,
PR comments, source files, or logs. `GITHUB_TOKEN` is supplied automatically by
GitHub Actions; no extra token is needed for the release workflow.

Source: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets

## 7. Release and verify

Configure the secrets before merging the updater PR. Pushes to `main` start the
release workflow automatically; a missing secret prevents the macOS release.

1. Check the **Release** workflow in GitHub Actions. The macOS build must complete
   signing and notarization, and the final release must contain both architectures,
   macOS ZIP/DMG artifacts, and `latest-mac.yml` update metadata.
2. Download the first signed release through a browser, install it into Applications,
   and launch it normally without removing quarantine manually.
3. Optionally check its signature, Gatekeeper assessment, and stapled ticket:

   ```sh
   codesign --verify --deep --strict --verbose=2 "/Applications/Morph.app"
   spctl --assess --type execute --verbose=4 "/Applications/Morph.app"
   xcrun stapler validate "/Applications/Morph.app"
   ```

4. Existing users need to install this first updater-enabled signed version manually.
5. After a newer signed version is released, use **Morph → Check for Updates…** in
   the older version. Confirm **Later** leaves the app running, then choose
   **Restart and Install**. Verify the version, settings, and history afterwards.
6. Repeat the upgrade check on Intel and Apple Silicon Macs; check Windows separately.

The app checks at launch and every six hours, downloads in the background, and
installs when the user chooses to restart. End-to-end update verification requires
two signed released versions; unit or mock checks cannot prove Apple's signing
and notarization pipeline works.
