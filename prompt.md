# Build a Premium Social Discovery & Random Video Chat Platform

## 1. Project Overview

Build a modern, premium-looking social discovery web application inspired by Omegle, OmeTV, Tinder and Hinge.

The platform allows users to:
- Connect with random people through video calls.
- Connect with random people through text chat.
- Choose a preferred gender for video and text conversations through paid packages.
- Discover people through a swipe-based dating system.
- Send and receive message requests.
- Chat privately after a message request is accepted.

The platform follows a freemium monetization model.

**Core business principle: Random interactions are free. Gender-preference interactions and extended dating discovery are paid.**

The application must have a very clean, intuitive interface. Users must never confuse free services with paid services.

All users must be adults (18+).

---

# 2. Design Direction

Create a sophisticated, modern social platform with a premium visual identity.

### Visual style
- Minimal, clean and premium.
- Modern SaaS meets social networking.
- White/light backgrounds for navigation and dashboards.
- Dark video-chat experience for immersive conversations.
- Subtle gradients and soft shadows.
- Rounded cards and smooth transitions.
- Clear typography and strong visual hierarchy.
- Avoid excessive colors, gradients and unnecessary animations.

### Suggested design system

Primary color: Deep Navy / Midnight Blue.

Accent color: Electric Blue.

Secondary color: Soft Purple.

Success: Green.

Premium: Gold.

Background: White and very light grey.

Use:
- Inter or Geist typography.
- Lucide icons.
- Tailwind CSS.
- shadcn/ui components.
- Responsive layouts.

The UI should look like a professionally funded technology startup, not a basic college project.

---

# 3. Application Navigation

Create a consistent top navigation bar with:

1. Video Chat
2. Text Chat
3. Dating
4. Messages (with unread notification count)
5. Profile
6. Settings
7. Get Premium button

The active navigation item must be visually highlighted.

The Get Premium button should open a dedicated pricing and subscription page.

On mobile, use a clean bottom navigation bar.

---

# 4. Authentication and Onboarding

Users can register through:
- Google authentication.
- Email and password.
- Email verification.

During onboarding collect:

Required:
- Full name or display name.
- Date of birth.
- Age eligibility (18+).
- Gender.
- Profile picture.

Optional:
- Bio.
- Interests.
- Preferred conversation language.
- Location (only with explicit consent).
- Preferred gender for matching.

Important:
- Do not automatically assume a user's preferred gender from their own gender.
- Ask users to select their preferred conversation partner.
- Validate that users are adults using an appropriate age-assurance process.
- Prevent duplicate trial abuse using server-side account and entitlement checks.

After onboarding, redirect users to the main dashboard.

---

# 5. VIDEO CHAT

Create a dedicated video-chat experience inspired by Omegle and OmeTV.

There are two modes.

## Mode A: Random Video Chat

**Price: FREE**

Features:
- Connect with randomly available users.
- No paid gender selection.
- Display the connected user's video.
- Display the user's own camera preview.
- Start/stop camera.
- Mute/unmute microphone.
- Next user button.
- End call button.
- Report and block buttons.
- Connection status.
- Call duration timer.

The matching system should connect compatible users according to their selected preferences, without guaranteeing a particular gender in free random mode.

### Initial free trial

Every newly authenticated user receives:

15 minutes of free video chat usage.

This is a one-time introductory allowance, not 15 minutes per call or per account login.

Display the remaining trial time clearly.

After the introductory allowance is exhausted, random video chat remains free under reasonable fair-use limits and infrastructure safeguards.

## Mode B: Preferred Gender Video Chat

**PAID SERVICE**

Allow users to select their preferred conversation partner's gender before starting the matching process.

Pricing:

- ₹599 = 60 minutes of connected video conversation.

Features:
- Gender selection.
- Matching queue.
- Remaining purchased minutes.
- Call duration timer.
- Next user.
- Disconnect.
- Report/block.
- Purchase history.

The purchased 60 minutes should be deducted only for actual connected conversation time, not while waiting for a match.

If a call disconnects, the unused balance must remain available.

Do not guarantee that a preferred-gender user will always be online. Show a clear waiting screen when no suitable match is available.

### Video Chat UI

Design the interface with:

- Large central video area.
- Local camera preview in a small floating card.
- Clear Start Video Chat button.
- Random / Preferred Gender mode selector.
- Visible Free and Premium labels.
- Remaining minutes indicator.
- Next and End Call controls.
- Report and Block controls.

Before starting a paid session, show a confirmation dialog explaining the price and included duration.

Never deduct payment without explicit confirmation.

---

# 6. TEXT CHAT

Create a separate text-chat section.

There are two modes.

## Mode A: Random Text Chat

**Price: FREE**

Features:
- Connect with random users.
- Real-time messaging.
- Next conversation button.
- End chat.
- Report and block.
- Typing indicator.
- Connection status.

Every newly authenticated user receives an introductory allowance of 15 minutes of text-chat usage.

This allowance is separate from the video-chat allowance.

After the introductory allowance, random text chat remains free under reasonable fair-use limits.

## Mode B: Preferred Gender Text Chat

**PAID SERVICE**

Pricing:

₹299 = 180 minutes (3 hours) of connected text-chat time.

Features:
- Select preferred gender.
- Randomly match with a compatible available user.
- Real-time messaging.
- Remaining purchased minutes.
- Typing indicator.
- Next conversation.
- Report/block.

Only deduct paid minutes while an active chat session is connected.

Display the remaining purchased balance.

### Text Chat UI

Create a clean two-column interface:

Left sidebar:
- Active conversation.
- Matching status.
- Recent conversations.

Main panel:
- Chat messages.
- Message input.
- Send button.
- Typing indicator.
- End conversation button.

Make the distinction between Random (Free) and Preferred Gender (Premium) extremely obvious.

---

# 7. DATING SECTION

Create a modern Tinder/Hinge-inspired dating experience.

**FREE LIMIT: 15 MUTUAL MATCHES**

After a user receives 15 mutual matches, additional dating discovery requires purchasing the premium dating package.

### Dating Premium

₹499 = 7 days of premium dating access.

Features:
- Continue discovering profiles.
- Unlimited eligible swipes during the subscription period, subject to fair-use protections.
- Advanced preference filters.
- See mutual matches.
- View received likes.
- Match notifications.

### Free dating features

- Create dating profile.
- Browse eligible profiles.
- Like or pass.
- Mutual matching.
- Up to 15 mutual matches.
- Basic profile discovery.

### Dating interface

Use a beautiful profile-card design.

Display:
- Profile picture.
- Name.
- Age.
- Short bio.
- Interests.
- General location, where voluntarily provided.
- Like button.
- Pass button.

Use swipe gestures on mobile.

Use smooth animations when liking or rejecting profiles.

### Important matching logic

A mutual match occurs only when both users independently like each other.

Count only successful mutual matches toward the 15-match free allowance.

Do not count:
- Likes sent.
- Likes received.
- Rejected profiles.
- Duplicate matches.

After the 15th mutual match, show a premium upgrade screen before allowing additional dating discovery.

Existing matches and their conversations should remain accessible.

---

# 8. MESSAGES SECTION

Create a dedicated messaging inbox.

Users cannot directly message strangers.

### Message request workflow

1. User A visits User B's profile.
2. User A sends a message request.
3. User B receives a notification.
4. User B can accept or reject the request.
5. If accepted, both users can communicate.
6. If rejected, the sender cannot continue messaging through that request.

Features:
- Incoming requests.
- Sent requests.
- Accepted conversations.
- Unread message count.
- Real-time messaging.
- Online status with privacy controls.
- Block/report functionality.

Messaging after request acceptance should be free.

Prevent spam by applying request limits and abuse detection.

---

# 9. PRICING AND PREMIUM PAGE

Create a dedicated pricing page with four clearly separated products.

Use attractive pricing cards.

### Product 1: Random Video Chat

FREE

- Random matching.
- Video calls.
- 15-minute introductory allowance.
- Free usage thereafter under fair-use limits.

### Product 2: Preferred Gender Video

₹599

- 60 connected minutes.
- Preferred gender selection.
- Real-time video.
- Next user.
- Remaining time tracking.

Button: Purchase Video Pack.

### Product 3: Preferred Gender Text

₹299

- 180 connected minutes.
- Preferred gender selection.
- Real-time messaging.
- Remaining time tracking.

Button: Purchase Text Pack.

### Product 4: Premium Dating

₹499

- 7 days of premium dating.
- Continue discovering profiles after the free 15 mutual matches.
- Advanced discovery filters.
- Additional dating features.

Button: Unlock Premium Dating.

### Pricing design requirements

- Clearly display price.
- Clearly display included duration.
- Clearly display whether a product is free or paid.
- Never use misleading discount labels.
- Never hide the actual charge.
- Do not automatically renew one-time packs.
- Explain that paid usage is subject to compatible users being available.
- Show a confirmation screen before checkout.

Do not automatically bundle the three purchases into a subscription.

---

# 10. USER DASHBOARD

Build a central dashboard displaying:

- Welcome message.
- Profile completion.
- Video chat quick access.
- Text chat quick access.
- Dating quick access.
- Message notifications.
- Remaining free trial allowances.
- Purchased video minutes.
- Purchased text minutes.
- Dating match count.
- Premium status.

Use small, attractive summary cards.

Example:

Video Trial: 12/15 minutes remaining.

Text Trial: 8/15 minutes remaining.

Dating Matches: 7/15 used.

Preferred Gender Video: 60 minutes available.

Preferred Gender Text: 180 minutes available.

Dating Premium: Not active.

Never confuse free trial balances with purchased balances.

---

# 11. ADMIN DASHBOARD

Create a protected administrative dashboard.

Features:

- Total registered users.
- Active users.
- Male/female user distribution, based on voluntarily supplied profile data.
- Current online users.
- Active video sessions.
- Active text sessions.
- Dating matches.
- Premium purchases.
- Revenue analytics.
- Refund management.
- User reports.
- User suspensions.
- Hostile or abusive behavior reports.
- Moderation tools.
- Verification status.

Admins must have role-based permissions.

Never expose private conversations or video content unnecessarily. Access to sensitive information must be tightly controlled and logged.

---

# 12. SAFETY AND MODERATION

Safety must be built into the MVP.

Mandatory features:

- Strict 18+ access.
- Appropriate age assurance.
- Report user.
- Block user.
- End conversation immediately.
- Anti-spam controls.
- Fake account detection.
- Profile verification.
- Abuse detection.
- Privacy settings.
- Grievance reporting.
- Data deletion requests.
- Terms of service and privacy policy.

Do not allow minors to participate.

Do not enable covert recording.

Do not claim that video calls are impossible to record by participants.

Implement clear consent and privacy disclosures.

---

# 13. TECH STACK

Use the following architecture.

### Frontend
- Next.js (App Router).
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- Lucide icons.

### Backend
- Node.js.
- Express.js.
- REST APIs.
- Socket.IO for real-time messaging and matchmaking events.

### Database
- PostgreSQL.
- Prisma ORM.

### Authentication
- Supabase Auth or a secure equivalent.
- Google OAuth.
- Email verification.

### Video
- WebRTC.
- STUN/TURN infrastructure.
- LiveKit as an alternative managed video infrastructure.

### Payments
- Razorpay, subject to business-model approval.
- Server-side payment verification.
- Webhook-based transaction confirmation.

### Deployment
- Vercel for frontend.
- Suitable backend hosting for persistent WebSocket connections.
- Managed PostgreSQL.
- Secure environment variables.

Keep the architecture modular and scalable.

Do not introduce Redis or Kafka in the initial MVP unless genuinely necessary.

---

# 14. DATABASE STRUCTURE

Design normalized PostgreSQL tables for:

1. users
2. profiles
3. user_preferences
4. dating_profiles
5. likes
6. matches
7. message_requests
8. conversations
9. messages
10. video_sessions
11. text_sessions
12. trial_entitlements
13. usage_balances
14. purchases
15. payment_transactions
16. subscriptions
17. reports
18. blocked_users
19. notifications
20. admin_users

Use proper foreign keys, indexes, unique constraints and transaction handling.

All paid balances and trial entitlements must be managed by the backend.

Never trust frontend timers or client-submitted payment status.

---

# 15. IMPORTANT BUSINESS LOGIC

Implement the following rules carefully.

### Trial system

- One-time 15-minute video trial per eligible account.
- Separate one-time 15-minute text trial per eligible account.
- Trial starts upon first use of the respective feature.
- Trial cannot reset through logout or page refresh.
- Server controls all usage balances.

### Video and text paid packs

- Video: ₹599 for 60 connected minutes.
- Text: ₹299 for 180 connected minutes.
- Deduct only actual connected usage.
- Preserve unused balances.
- Record every deduction in an auditable transaction ledger.

### Dating

- 15 mutual matches free.
- ₹499 for seven days of premium dating.
- Existing matches and conversations remain accessible after the free limit.
- The premium expiry timestamp must be managed on the server.

### Matching

- Random mode: no guaranteed gender.
- Preferred gender mode: match based on selected gender preference and availability.
- Avoid duplicate active sessions.
- Handle disconnections and timeouts.
- Never expose a user's private contact information.

---

# 16. UX REQUIREMENTS

This is extremely important.

The user should understand the entire product without needing instructions.

Use clear labels everywhere:

GREEN / FREE:
- Random Video.
- Random Text.
- First 15 minutes of introductory usage.
- Basic Dating.
- Accepted Messages.

GOLD / PREMIUM:
- Preferred Gender Video.
- Preferred Gender Text.
- Dating after 15 mutual matches.

Every premium action should display its price before the user proceeds.

Every active session should display its remaining time.

Never show an unexpected payment popup.

Use empty states, loading skeletons, connection indicators and friendly error messages.

---

# 17. DEVELOPMENT INSTRUCTIONS

Do not create a static UI prototype only.

Build a functional full-stack MVP.

Development order:

Phase 1:
- Project setup.
- Authentication.
- Database.
- User profiles.

Phase 2:
- Random text matching.
- Real-time messaging.
- Message requests.

Phase 3:
- Video chat.
- Random matching.
- Preferred-gender matching.

Phase 4:
- Dating swipe interface.
- Mutual match logic.
- Fifteen-match free allowance.

Phase 5:
- Trial entitlement system.
- Payment gateway.
- Paid video/text packs.
- Premium dating access.

Phase 6:
- Admin dashboard.
- Safety and moderation.
- Testing.
- Deployment.

Before implementing each phase:
- Explain the architecture.
- Create reusable components.
- Define API contracts.
- Implement backend validation.
- Test edge cases.
- Maintain clean TypeScript types.

Do not use mock data for payment, authentication, matching or user balances in production.

Do not leave buttons non-functional.

Deliver a complete, responsive, secure, production-oriented MVP with a polished user experience.