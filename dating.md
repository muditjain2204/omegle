# Feature: Dating & Matching System (Inspired by Tinder & Hinge)

## 1. Objective

Integrate a Dating & Matching feature into our existing Omegle-style random chat platform.

The feature should work similarly to Tinder and Hinge, allowing users to discover new people, view their profiles, like people they are interested in, and connect when both users like each other.

Keep the experience simple, modern, user-friendly, and easy to understand.

Do not copy Tinder or Hinge branding or UI. Create our own unique design.

## 2. User Profile Setup

Before using the dating feature, users should be able to create a dating profile.

Profile fields:
- Profile pictures (minimum 1, maximum 6).
- First name.
- Age (18+ only).
- Gender.
- Interested in (Male / Female / Everyone).
- Location (City).
- Short bio (maximum 300 characters).
- Interests (Music, Travel, Movies, Gaming, Sports, etc.).
- Relationship intention (Friendship / Casual Dating / Serious Relationship).

Users can edit their profiles anytime.

## 3. Discover People (Like Tinder)

Create a Discover page where users can explore other people's dating profiles.

Each profile card should display:
- Main profile picture.
- Name and age.
- Location.
- Short bio.
- Interests.
- Relationship intention.

Users should have three main actions:

**Pass:** Skip the current profile and show another person.

**Like:** Send a like to the person.

**Super Like:** Send a special notification to show extra interest (optional premium feature).

Users should be able to browse profiles one by one using swipe gestures on mobile and buttons on desktop.

## 4. Mutual Matching System

This is the main functionality.

Matching should work like this:

1. User A visits User B's profile.
2. User A clicks Like.
3. The system stores the like.
4. User B receives a notification that someone liked their profile.
5. If User B also likes User A, a MATCH is created.
6. Both users receive a notification: "It's a Match!"
7. Both users can now start chatting.

Important:
- A match should only be created when both users like each other.
- Prevent duplicate likes.
- Do not allow users to like themselves.
- Users who have already passed or liked someone should not repeatedly see the same profile.

## 5. Likes You Page (Inspired by Tinder)

Create a separate page called "Likes You".

Display profiles of people who have liked the current user.

For each profile:
- Show their picture.
- Name and age.
- Short bio.
- Like Back button.
- Pass button.

When the user clicks Like Back, create a mutual match.

Optional: Blur profile pictures for free users and allow premium users to see all incoming likes.

## 6. Matches Page

Create a Matches page where users can see all their mutual matches.

Each match card should display:
- Profile picture.
- Name.
- Age.
- Match date.
- Online status (if available).

Clicking a match should open a private conversation.

## 7. Chat & Video Calling

After two users match, allow them to:

- Send text messages.
- Share emojis.
- Send images (optional).
- Start a private video call.
- End or disconnect the call.

Reuse the existing chat and video infrastructure wherever possible.

The dating feature should be separate from the existing random chat system.

## 8. Filters & Preferences

Allow users to filter profiles by:

- Age range.
- Gender.
- Distance or city.
- Interests.
- Relationship intention.

Add a simple filter panel with Apply and Reset buttons.

## 9. Notifications

Create notifications for:

- Someone liked your profile.
- You got a new match.
- You received a new message.
- Someone sent you a Super Like.

Notifications should be visible through a notification icon.

## 10. Safety & Privacy

Implement:
- Block user.
- Report user.
- Unmatch user.
- Hide profile.
- Profile visibility settings.
- Only verified 18+ users can access dating.
- Never expose private contact details.
- Add rate limits to prevent spam likes.
- Provide reporting and moderation workflows.

## 11. Suggested Navigation

Add a new Dating section to the existing platform.

Dating navigation:

- Discover
- Likes You
- Matches
- My Profile

Keep the existing Omegle features unchanged.

## 12. UI/UX Design

Design a premium-looking, modern dating interface.

Design inspiration:
- Tinder's simple swipe-based discovery.
- Hinge's detailed profiles and interests.
- Modern dating app layouts.

Design requirements:
- Beautiful profile cards.
- Smooth swipe animations.
- Rounded buttons and cards.
- Attractive profile image layouts.
- Responsive mobile and desktop interface.
- Dark and light mode compatibility.
- Clear empty states.
- Loading skeletons.

## 13. Backend & Database Requirements

Create the necessary database models:

- DatingProfile
- DatingLike
- DatingMatch
- DatingPreference
- DatingMessage
- DatingNotification
- DatingBlock
- DatingReport

Implement proper relationships and database constraints.

Important backend logic:
- Prevent duplicate likes.
- Create matches atomically when mutual likes exist.
- Prevent blocked users from discovering or contacting each other.
- Restrict private messaging to matched users.
- Validate all requests on the backend.
- Protect user data and profile visibility.

## 14. Development Instructions

Before implementing:

1. Inspect the existing project structure.
2. Understand the current authentication system.
3. Identify the existing chat and video call infrastructure.
4. Reuse existing components and APIs wherever possible.
5. Do not break existing random text or video chat functionality.
6. Build the dating feature as a separate module.
7. Implement backend functionality, not just frontend UI.
8. Test the complete matching flow using two different test accounts.

## 15. Expected User Journey

User Registration → Create Dating Profile → Discover People → Like Someone → Other Person Likes Back → Mutual Match → Private Chat → Video Call.

The final result should feel like a simple combination of Tinder's discovery system and Hinge's profile experience, integrated into our existing Omegle platform.