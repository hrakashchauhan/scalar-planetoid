import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const room = req.nextUrl.searchParams.get('room');
        const username = req.nextUrl.searchParams.get('username');
        const role = req.nextUrl.searchParams.get('role'); // 'teacher' or 'student'

        if (!room || !username) {
            return NextResponse.json(
                { error: 'Missing "room" or "username"' },
                { status: 400 }
            );
        }

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

        if (!apiKey || !apiSecret || !wsUrl) {
            return NextResponse.json(
                { error: 'Server misconfigured' },
                { status: 500 }
            );
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: username,
            name: username,
        });

        // Permissions depend on role
        if (role === 'teacher') {
            at.addGrant({ roomJoin: true, room: room, canPublish: true, canSubscribe: true, canPublishData: true });
        } else {
            // Student: Can only subscribe (watch), can publish generic data (like focus status), but maybe restrict media?
            // For now, let's allow publishData for focus events, but maybe restrict video/audio publishing if we want strict mode.
            // But typically students might want to ask questions? The spec says "Viewer component where students JUST Watch".
            // So we disable canPublish for media, but enable canPublishData for focus signals.
            at.addGrant({
                roomJoin: true,
                room: room,
                canPublish: false,
                canSubscribe: true,
                canPublishData: true // Needed for sending 'FOCUS_LOST' events
            });
        }

        const token = await at.toJwt();

        return NextResponse.json({ token });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
