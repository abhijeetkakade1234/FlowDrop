# Phase 2: Single Image Share

## Goal

Extend the current text session so two connected devices can share one image at a time.

This is not the "full file sharing" phase.

This phase only proves:

- the session `+` action can open a share entry point
- a user can pick one image from the device
- the sender can preview it before sending
- the receiver sees it inline in the live session
- the image follows the same temporary model as the rest of FlowDrop

## Why This Phase Exists

The core pairing and text loop already exists.

The next useful step is not multiple files, not folders, not drag and drop.
It is one real image moving cleanly from one device to the other.

If one image feels smooth, then multi-image sharing can be added later on top of something real.

## User Flow

### Sender

1. User pairs both devices
2. User enters the live session
3. User taps the `+` icon in the composer row
4. A small share picker opens
5. User sees `Image`, `Video`, and `Docs`
6. User chooses `Image`
7. Device file picker opens
8. User selects one image
9. FlowDrop shows a small preview state
10. User confirms send
11. Image appears in the thread

### Receiver

1. Receiver is already connected in the same session
2. Sender sends one image
3. Receiver sees the image inline in the thread
4. Receiver can tap it to view it larger
5. Receiver can download it while the session is still valid

## Scope

### In Scope

- one image at a time
- session `+` action
- image picker entry
- sender-side preview before send
- inline image message in the thread
- inline image preview
- download image while session is active
- image-only allowlist
- size limit
- delete image when the session expires

### Out of Scope

- multiple image selection
- generic file uploads
- drag and drop
- paste image from clipboard
- image compression pipeline
- captions
- image editing
- albums/gallery management
- resumable uploads
- rich progress UI

## UX Notes

### Entry Point

Use the existing `+` icon in the session composer.

On tap:

- open a small action sheet / share picker
- keep it minimal
- show `Image`, `Video`, and `Docs`
- only `Image` works in Phase 2
- `Video` and `Docs` stay visible as placeholders

No need to build a full attachment platform right now.

### Preview

Before sending:

- show a thumbnail preview
- show file name if easy
- show a `Send` action
- show a `Cancel` action

Do not send immediately after selection.

Do not build a heavy preview editor.

### Thread Message

The sent image should render as:

- one message bubble/card
- image thumbnail/preview
- timestamp
- sender alignment consistent with text messages

The received image should also expose a simple download action while the session is active.

Do not build a modal image viewer in Phase 2.
Inline image plus click/download is enough.

### Failure States

Need basic handling for:

- invalid file type
- file too large
- upload failed
- expired session
- receiver disconnected

Keep errors blunt and clear.

## Suggested Technical Shape

### Frontend

Add to the session screen:

- `+` action opens picker
- hidden file input for image selection
- local preview state for one selected image
- send action for selected image
- received image rendering in message list

Keep state simple:

- one selected image
- one sending flag
- one error message

### Backend

Need a minimal image path in addition to text:

- accept one uploaded image
- validate type
- validate size
- store temporary metadata
- return a message payload the session can broadcast

The lazy version is enough.

### Storage

The image should stay temporary like the session.

Rules:

- image expires with session policy
- image can be downloaded only while the session is valid
- cleanup should remove expired images
- no permanent library/history

## First-Pass Limits

Use a 10 MB max image size in the first pass.

Allowed types:

- image/jpeg
- image/png
- image/webp

## Message Model Direction

Current text messages already exist.

Phase 2 should extend the thread model so a message can be either:

- text
- image

For image messages, the UI needs:

- message id
- sender device id
- created time
- image reference

No need to solve every future attachment type now.

## Constraints

- mobile-first interaction
- must still feel fast
- no login
- no permanent storage model
- no feature bloat in the composer

If Phase 2 makes the session feel heavy, it is wrong.

## Acceptance Criteria

Phase 2 is good enough when:

- a connected user can tap `+` and choose one image
- the sender can preview before send
- the receiver gets the image inline without refresh
- the receiver can download the image before the session expires
- invalid files are rejected cleanly
- oversized files are rejected cleanly
- expired session rules still apply
- expired session cleanup removes the image
- the basic text flow still feels untouched

## Build Order

1. define the one-image message shape
2. add session UI entry from `+`
3. add file picker and preview state
4. add backend upload path
5. broadcast image message into the live session
6. render received image in thread
7. add cleanup and error handling

## Review Questions

- `+` menu shows `Image`, `Video`, and `Docs`, but only `Image` works in Phase 2
- image send requires preview first, then explicit send
- first-pass image size cap is 10 MB
- no modal viewer in Phase 2; inline preview with click/download is enough

## Recommendation

Keep it brutally small:

- `Image`, `Video`, and `Docs` visible in the `+` menu, but only `Image` active
- explicit preview then send
- one image only
- no compression
- no multi-select

That is enough to prove the feature.
