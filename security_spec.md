# Security Specification - Barber Elite App

## Data Invariants & Zero-Trust Policies
1. **User Data Ownership**: All subcollections (`clients`, `services`, `materials`, `drinks`, `sales`, `appointments`, `adjustments`, `notifications`, `requests`) belong strictly to their parent barber (`/users/{userId}`). Only the authenticated owner (`request.auth.uid == userId`) or verified system admin can read, modify, or delete this private data.
2. **PII Protection & Least Privilege**: Client contact information (names, phone numbers, visit history, revenue) stored in `/clients`, `/appointments`, and `/requests` must never be exposed to unauthenticated public visitors or competitor barbers.
3. **Public Booking Surface Isolation**: The public booking interface is strictly restricted to:
   - Reading the barber's public profile (`shopName`, `phone`, `profileImage`, `businessHours`, `unavailableSlots`)
   - Reading the public service catalog (`services`)
   - Creating valid, schema-compliant booking requests (`requests`)
   - Unauthenticated visitors are strictly forbidden from listing the entire `/requests` or `/appointments` collections.
4. **Administrative & Configuration Protection**: Global system configuration (`/system/config`) is strictly read-only for users/clients and write-protected exclusively for verified administrators (`brendomsiqueira96@gmail.com`).
5. **Privilege Escalation Immunity**: Users cannot elevate their own permissions (e.g., setting `role: "admin"` in user documents).
6. **Financial & Historical Integrity**: Sales records (`/sales`) and balance adjustments (`/adjustments`) are immutable historical records once written and cannot be modified by arbitrary users.
7. **Input Boundary & Denial-of-Wallet Guards**: All input fields have hard length constraints (`size() <= MAX`), numbers must be non-negative, and document IDs must conform to alphanumeric patterns (`isValidId()`).

## The "Dirty Dozen" Payloads (Red Team Test Cases)

1. **Identity Theft (Create User)**:
   - *Target*: `POST /users/victim_user_id` with `auth.uid = "attacker_uid"`
   - *Payload*: `{"username": "impostor", "shopName": "Hacked Shop"}`
   - *Expected*: `PERMISSION_DENIED` (UID mismatch, must match `request.auth.uid`).

2. **Access Breach (Read Client PII)**:
   - *Target*: `GET /users/matheus_farias/clients` with `auth = null` or `auth.uid = "stranger_uid"`
   - *Expected*: `PERMISSION_DENIED` (Strictly authenticated and owner-only).

3. **Ghost Fields Injection (Client Document)**:
   - *Target*: `POST /users/{userId}/clients/123`
   - *Payload*: `{"id": "123", "name": "Fake", "phone": "123", "totalSpent": 0, "secretBackdoor": true, "extraField": "malicious"}`
   - *Expected*: `PERMISSION_DENIED` (Schema violation / extra keys forbidden).

4. **Price & Negative Numeric Manipulation (Create Service)**:
   - *Target*: `POST /users/{userId}/services/s1`
   - *Payload*: `{"id": "s1", "name": "Free Cut", "price": -50.00, "duration": 30}`
   - *Expected*: `PERMISSION_DENIED` (Price must be `>= 0`).

5. **Role Escalation (Update User)**:
   - *Target*: `PATCH /users/{userId}`
   - *Payload*: `{"role": "admin"}`
   - *Expected*: `PERMISSION_DENIED` (Non-admin users cannot grant themselves admin status).

6. **Public Request Scraping (Dump All Client Numbers)**:
   - *Target*: `GET /users/matheus_farias/requests` with `auth = null`
   - *Expected*: `PERMISSION_DENIED` (Listing requests is forbidden for unauthenticated visitors).

7. **Negative Stock & Inventory Tampering (Update Drink)**:
   - *Target*: `PATCH /users/{userId}/drinks/d1`
   - *Payload*: `{"stock": -10}`
   - *Expected*: `PERMISSION_DENIED` (Stock must be `>= 0`).

8. **Notification Spam / DoS Flooding**:
   - *Target*: `POST /users/{userId}/notifications/n1` with `auth = null`
   - *Payload*: `{"id": "n1", "title": "SPAM", "message": "SPAM", "date": "2026-09-06"}`
   - *Expected*: `PERMISSION_DENIED` (Only authorized owner or admin can create notifications).

9. **Historical Sales Tampering**:
   - *Target*: `PATCH /users/{userId}/sales/s1`
   - *Payload*: `{"price": 0.01}`
   - *Expected*: `PERMISSION_DENIED` (Sales are immutable records).

10. **Global System Config Tampering**:
    - *Target*: `PUT /system/config` with `auth = null` or non-admin
    - *Payload*: `{"maintenance": true, "version": "999.0"}`
    - *Expected*: `PERMISSION_DENIED` (Write allowed only for verified admin `brendomsiqueira96@gmail.com`).

11. **ID Poisoning / Denial-of-Wallet**:
    - *Target*: `POST /users/{userId}/clients/AAAAAAAAAAAAAAAAAAAA...` (2KB ID string)
    - *Payload*: `{"id": "...", "name": "Test", "phone": "123", "totalSpent": 0}`
    - *Expected*: `PERMISSION_DENIED` (ID must satisfy `isValidId()` <= 128 chars regex).

12. **Appointment State Tampering**:
    - *Target*: `PATCH /users/{userId}/appointments/a1` with negative price or invalid status
    - *Payload*: `{"finalPrice": -100, "status": "malicious_status"}`
    - *Expected*: `PERMISSION_DENIED` (Status enum check & non-negative price).

## Target Collections & Access Control Matrix

| Path | Read Access | Write Access | Validation Blueprint |
| :--- | :--- | :--- | :--- |
| `/system/config` | Public / Authenticated | Verified Admin Only | `isValidSystemConfig` |
| `/users/{userId}` | Public (Profile info) | Owner / Verified Admin | `isValidUser` |
| `/users/{userId}/clients/*` | Owner / Admin | Owner / Admin | `isValidClient` |
| `/users/{userId}/services/*` | Public / Owner | Owner / Admin | `isValidService` |
| `/users/{userId}/appointments/*` | Owner / Admin | Owner / Admin | `isValidAppointment` |
| `/users/{userId}/requests/*` | Owner / Admin (Get self by ID) | Public (Create pending) / Owner (Manage) | `isValidRequest` |
| `/users/{userId}/materials/*` | Owner / Admin | Owner / Admin | `isValidMaterial` |
| `/users/{userId}/drinks/*` | Owner / Admin | Owner / Admin | `isValidDrink` |
| `/users/{userId}/sales/*` | Owner / Admin | Owner (Create only) / Admin | `isValidSale` |
| `/users/{userId}/adjustments/*`| Owner / Admin | Owner / Admin | `isValidAdjustment` |
| `/users/{userId}/notifications/*`| Owner / Admin | Owner / Admin | `isValidNotification` |

