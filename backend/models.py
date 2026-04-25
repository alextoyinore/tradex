from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime
from pydantic import BaseModel
from typing import List, Optional

# --- SQLAlchemy ORM Models ---

class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    pair = Column(String)
    strategy = Column(String)
    status = Column(String, default="stopped")
    profit = Column(Float, default=0.0)
    uptime = Column(String, default="0d 0h")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    trades = relationship("Trade", back_populates="agent")

class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"))
    pair = Column(String)
    type = Column(String) # BUY / SELL
    price = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    agent = relationship("Agent", back_populates="trades")


# --- Pydantic Schemes for API ---

class AgentModel(BaseModel):
    id: int
    name: str
    pair: str
    strategy: str
    status: str
    profit: float
    uptime: str

    class Config:
        from_attributes = True

class MarketPriceModel(BaseModel):
    pair: str
    type: str
    price: str
    change: float
    volume: str

class AgentCreateParams(BaseModel):
    name: str
    pair: str
    strategy: str

class TradeModel(BaseModel):
    id: int
    agent_id: int
    pair: str
    type: str # BUY / SELL
    price: float
    timestamp: datetime.datetime
    agent: Optional[AgentModel] = None

    class Config:
        from_attributes = True
