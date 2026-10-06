import json
from channels.generic.websocket import AsyncWebsocketConsumer

class StudioConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.project_id = self.scope['url_route']['kwargs']['project_id']
        self.room_group_name = f"project_{self.project_id}"

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        
        # Broadcast message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'studio_message',
                'message': data
            }
        )

    # Receive message from room group
    async def studio_message(self, event):
        message = event['message']

        # Send message to WebSocket
        await self.send(text_data=json.dumps(message))
