import type { FastifyInstance } from "fastify";
import { authenticateUser } from "../middleware/auth";
import { createNotificationController } from "../controllers/notification.controller";

export async function notificationRoutes(app: FastifyInstance) {
    const { listNotifications, markAsRead, markAllAsRead } =
        createNotificationController(app);

    app.get<{ Querystring: { page?: string } }>(
        "/notifications",
        { preHandler: [authenticateUser] },
        listNotifications,
    );

    app.patch(
        "/notifications/read-all",
        { preHandler: [authenticateUser] },
        markAllAsRead,
    );

    app.patch<{ Params: { notificationId: string } }>(
        "/notifications/:notificationId/read",
        { preHandler: [authenticateUser] },
        markAsRead,
    );
}
