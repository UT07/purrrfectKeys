# Purrrfect Keys — Privacy Policy

**Last Updated:** 3 March 2026

Purrrfect Keys ("the App") is a piano learning application developed for iOS and Android. This policy explains what data we collect, how we use it, and your rights.

---

## 1. Data We Collect

### Account Data
- **Email address** (if you sign in with email, Google, or Apple)
- **Display name** (optional, set by you)
- **Authentication tokens** (managed by Firebase Authentication)

Anonymous users are assigned a random identifier with no personally identifiable information.

### Learning Data
- Exercise scores, accuracy breakdowns, and timing data
- Lesson progress, XP, level, and streak information
- Cat companion selections, evolution progress, and gem balance
- Song mastery records
- Daily challenge completions

### Usage Data
- App open/close events, screen views, session duration
- Feature usage analytics (collected via PostHog)
- Device type and OS version (no device identifiers)

### AI Coaching Data
- When AI coaching is enabled, your **exercise score summary** (overall %, accuracy %, timing %, missed notes) is sent to Google Gemini to generate feedback
- **No audio recordings** are ever transmitted — all audio processing happens on your device
- **No personal information** (name, email, age) is included in AI requests

---

## 2. Data We Do NOT Collect

- **Audio recordings** — Microphone input is processed entirely on-device for pitch detection. Raw audio never leaves your device.
- **MIDI data** — MIDI keyboard input is processed locally and never transmitted.
- **Precise location** — We do not request or use location services.
- **Contacts, photos, or files** — We do not access any data outside the App.
- **Advertising identifiers** — We do not use ad tracking.

---

## 3. How We Use Your Data

| Purpose | Data Used | Legal Basis |
|---------|-----------|-------------|
| Provide core learning experience | Learning data, scores | Service delivery |
| Cross-device sync | Account + learning data | Service delivery |
| AI coaching feedback | Score summaries (no PII) | Legitimate interest |
| Voice coaching (TTS) | Coaching text (no PII) | Service delivery |
| App improvement & analytics | Anonymised usage events | Legitimate interest |
| Account security | Auth tokens | Service delivery |

---

## 4. Third-Party Services

| Service | Purpose | Data Shared | Privacy Policy |
|---------|---------|-------------|----------------|
| **Firebase** (Google) | Authentication, database, cloud functions | Account data, learning data | [firebase.google.com/support/privacy](https://firebase.google.com/support/privacy) |
| **Google Gemini** | AI coaching, exercise generation, song generation | Score summaries (no PII) | [ai.google/privacy](https://ai.google/privacy) |
| **ElevenLabs** | Text-to-speech voice generation | Coaching text (no PII) | [elevenlabs.io/privacy](https://elevenlabs.io/privacy) |
| **PostHog** | Product analytics | Anonymised usage events | [posthog.com/privacy](https://posthog.com/privacy) |
| **Expo/EAS** | App distribution, updates | Device type, OS version | [expo.dev/privacy](https://expo.dev/privacy) |

No data is sold to third parties. No data is used for advertising.

---

## 5. Data Storage & Security

- Data is stored in **Google Cloud Firestore** (encrypted at rest and in transit via TLS)
- Local data is stored on-device using encrypted storage
- Authentication is handled by Firebase Auth with industry-standard security
- API keys for AI services are managed via Cloud Functions (server-side) to prevent client exposure

---

## 6. Data Retention

- **Active accounts:** Data retained while your account is active
- **Deleted accounts:** All user data is permanently deleted within 30 days of account deletion (see Section 7)
- **Analytics data:** Anonymised, retained for up to 12 months
- **AI coaching cache:** Cached responses expire after 2 hours

---

## 7. Your Rights — Data Deletion

You can delete your account and all associated data at any time:

1. Open **Profile** > **Settings** > **Delete Account**
2. Confirm deletion

This permanently removes:
- Your authentication account
- All exercise scores and progress
- Cat evolution and gem data
- Social data (friends, friend code, league membership)
- Activity feed posts
- All Firestore subcollections

Account deletion is irreversible.

---

## 8. Children's Privacy

Purrrfect Keys is designed to be suitable for users of all ages. We do not knowingly collect personal information from children under 13 (or applicable age in your jurisdiction) beyond what is described in this policy.

- Anonymous accounts require no personal information
- Email sign-in is optional and controlled by the user or their parent/guardian
- No social features expose personal information to other users (friend codes are anonymous identifiers)

If you believe a child has provided personal information without parental consent, please contact us and we will promptly delete it.

---

## 9. Changes to This Policy

We may update this policy from time to time. Material changes will be communicated through the App. Continued use after changes constitutes acceptance.

---

## 10. Contact

For privacy questions, data requests, or concerns:

**Email:** privacy@purrrfectkeys.app

---

*This privacy policy applies to Purrrfect Keys version 1.0 and later.*
