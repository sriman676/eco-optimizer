from fastapi import APIRouter, Query
from services.weather import get_weather

router = APIRouter(prefix="/api/weather", tags=["weather"])


@router.get("/")
async def fetch_weather(city: str = Query(default="London")):
    return await get_weather(city)
