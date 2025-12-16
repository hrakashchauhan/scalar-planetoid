import { RoomServiceClient } from 'livekit-server-sdk';

const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

export const roomService = new RoomServiceClient(livekitUrl!, apiKey!, apiSecret!);
