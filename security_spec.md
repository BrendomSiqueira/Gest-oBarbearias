# Security Specification - Barber Elite App

## Data Invariants
1. Users own their profile and data (clients, services, appointments, etc.).
2. Only the owner of a profile or a global admin can read/write that user's data.
3. System configuration is read-only for authenticated users and writeable only by admins.
4. Notifications are created by the system/admin but readable/manageable by the user.

## The "Dirty Dozen" Payloads (Red Team Test Cases)

1. **Identity Theft (Create User)**: Attempt to create a user profile with a `userId` that doesn't match the authenticated UID.
2. **Access Breach (Read Client)**: Attempt to read another user's client list.
3. **Ghost Client (Create Client)**: Attempt to create a client document with extra hidden fields (e.g., `isVIP: true` if not allowed by schema).
4. **Price Manipulation (Create Service)**: Attempt to set a negative price for a service.
5. **Role Escalation (Update User)**: Attempt to update own user document to set `role: 'admin'`.
6. **Appointment Overlap (Update Appointment)**: Attempt to update an appointment to a terminal state ('completed') and then update it again.
7. **Negative Stock (Update Drink)**: Attempt to set drink stock to a negative value.
8. **Impersonation Notification (Create Notification)**: User attempting to create their own notification.
9. **History Tampering (Update Sale)**: Attempting to change the `price` of a sale after it's been recorded.
10. **Global Config Breach (Update Config)**: Non-admin attempting to modify `/system/config`.
11. **ID Poisoning**: Attempt to create a document with a 2KB string as ID.
12. **PII Leakage**: Attempt to read any user profile without being that user.

## Target Collections & Paths
- `/system/config`
- `/users/{userId}`
- `/users/{userId}/clients/{clientId}`
- `/users/{userId}/services/{serviceId}`
- `/users/{userId}/materials/{materialId}`
- `/users/{userId}/drinks/{drinkId}`
- `/users/{userId}/sales/{saleId}`
- `/users/{userId}/appointments/{appointmentId}`
- `/users/{userId}/adjustments/{adjustmentId}`
- `/users/{userId}/notifications/{notificationId}`
