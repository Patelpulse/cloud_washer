const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// Listen for new notifications in Firestore and send FCM to User
exports.sendNotificationOnCreate = functions.firestore
    .document("notifications/{notificationId}")
    .onCreate(async (snap, context) => {
        const data = snap.data();
        const userId = data.userId;
        const title = data.title;
        const body = data.message;

        if (!userId || !title || !body) {
            console.log("Missing data for notification");
            return null;
        }

        try {
            // Get User's FCM Token from their profile
            const userDoc = await admin.firestore().collection("users").doc(userId).get();
            const fcmToken = userDoc.data().fcmToken;

            if (!fcmToken) {
                console.log(`No FCM token found for user ${userId}`);
                return null;
            }

            // Construct payload
            const payload = {
                notification: {
                    title: title,
                    body: body,
                    sound: "default",
                },
                data: {
                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                    orderId: data.orderId || "",
                    status: data.status || "",
                },
                token: fcmToken,
            };

            // Send FCM
            const response = await admin.messaging().send(payload);
            console.log("Successfully sent message:", response);

            return snap.ref.update({ status: "sent", sentAt: admin.firestore.FieldValue.serverTimestamp() });
        } catch (error) {
            console.log("Error sending message:", error);
            return snap.ref.update({ status: "failed", error: error.message });
        }
    });

// Optional: Admin Notification Trigger (if writing to admin_notifications)
exports.sendAdminNotificationOnCreate = functions.firestore
    .document("admin_notifications/{notificationId}")
    .onCreate(async (snap, context) => {
        // Similar logic if you have stored Admin Tokens in an 'admins' collection
        // For now, logged only.
        console.log("New Admin Notification created", snap.data());
        return null;
    });
