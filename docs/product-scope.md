# Product Scope

## Positioning

FlowDrop is not a chat app and not a cloud drive.

It is a temporary bridge between two devices.

The first version should feel like:

- open
- pair
- paste
- done

If the first slice cannot beat "send it to myself on WhatsApp" for text, the rest does not matter.

## Text-First MVP

Ship only this:

1. Device A creates a session
2. Device A sees a 6-digit code
3. Device B enters the code
4. Both devices connect
5. Either side sends text
6. Text appears instantly on the other side
7. Session and messages disappear after 1 hour

## Explicitly Out For Now

- files
- images
- videos
- drag and drop
- clipboard file paste
- QR scanner
- presence for more than 2 devices
- delivery receipts
- search
- account system
- analytics or tracking

## Product Constraints

- no login
- no onboarding
- no permanent history
- no long-lived sessions
- no dependency on native clipboard sync

## User Experience Rules

- OTP creation must be one tap
- OTP entry must be frictionless on mobile
- connection state must be obvious
- text send must feel instant
- expiry must be visible but not noisy

## Success Bar For Phase 1

The MVP is good enough when:

- pairing usually completes in under 10 seconds
- the UI makes the temporary/privacy model obvious
- text reliably arrives on the paired device
- expired sessions are actually cleaned up

## Why This Scope

Files make everything harder:

- upload limits
- MIME validation
- object storage lifecycle
- progress state
- mobile failure cases
- preview UX

Text avoids all of that and proves the core loop first.
