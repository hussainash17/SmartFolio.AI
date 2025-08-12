from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic.networks import EmailStr

from app.api.deps import get_current_active_superuser
from app.model import Message
from app.utils import generate_test_email, send_email
from app.services.websocket_manager import manager

router = APIRouter(prefix="/utils", tags=["utils"])


@router.post(
    "/test-email/",
    dependencies=[Depends(get_current_active_superuser)],
    status_code=201,
)
def test_email(email_to: EmailStr) -> Message:
    """
    Test emails.
    """
    email_data = generate_test_email(email_to=email_to)
    send_email(
        email_to=email_to,
        subject=email_data.subject,
        html_content=email_data.html_content,
    )
    return Message(message="Test email sent")


@router.get("/health-check/")
async def health_check() -> bool:
    return True


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep the socket alive; client messages are ignored for now
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
