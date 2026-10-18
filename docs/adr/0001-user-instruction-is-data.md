# User review instructions are untrusted data

Web chat text is a `ReviewInstruction` on the task turn, inside `<user_instruction>` fences. It is not written into the system prompt, and it is not allowed to replace `{{contractPath}}`.

CLI and TUI call `defaultReviewInstruction()` because they have no separate user message.

Status: accepted.
