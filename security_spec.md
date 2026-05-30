# Security Specification for Print Registry App

## Data Invariants
1. A Package must have a name, packagePrice, status, and createdAt.
2. Only verified users can create or update data.
3. Only the master admin can delete registry data.
4. All status fields must be from a restricted set.

## The Dirty Dozen Payloads
1. **Unauthenticated create**: `{ "name": "Hack", "packagePrice": 0 }` (No JWT) - REJECT
2. **Unverified email create**: `{ "name": "Hack", "packagePrice": 0 }` (token.email_verified=false) - REJECT
3. **Id Poisoning**: Create document with ID `/packages/...+1KB junk...` - REJECT
4. **Shadow Update**: `{ "name": "Pro", "packagePrice": 100, "isVerified": true }` (Ghost field) - REJECT
5. **PII Leak**: List users and get their private details - REJECT
6. **State Shortcut**: Move a job from 'Prepress' directly to 'Delivered' bypass - (Need to implement state transitions)
7. **Identity Spoofing**: Set `clientId` to a resource I don't own (N/A as registry is shared)
8. **Denial of Wallet**: Large string in `name` field (>100 chars) - REJECT
9. **Invalid Type**: Set `packagePrice` to "Free" (string instead of number) - REJECT
10. **Time Spoofing**: Provide `createdAt` from client that is in the future - REJECT
11. **Price Manipulation**: Update `packagePrice` to a negative value - REJECT
12. **Admin Spoofing**: Attempt to delete as non-admin - REJECT

## Test Runner
(Tests would be implemented in `firestore.rules.test.ts` if a test runner was available, but I will simulate the logic in rules).
