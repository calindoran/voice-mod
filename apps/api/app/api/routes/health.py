from fastapi import APIRouter

from ...schemas.auth import HealthResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Check API health",
    description="Returns a simple status response when the API process is available.",
)
async def health_check() -> HealthResponse:
    return HealthResponse(status="ok")
