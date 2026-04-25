from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import asyncio
import json

from database import engine, get_db, Base
from models import Agent, Trade, AgentModel, MarketPriceModel, AgentCreateParams, TradeModel
from market_simulator import simulator

# Create initial tables in database
Base.metadata.create_all(bind=engine)

app = FastAPI(title="TradeX AI API")

# Setup CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initial Mock Data if DB is empty
def init_db(db: Session):
    if db.query(Agent).count() == 0:
        mock_agents_data = [
            {"name": "Alpha Trend", "pair": "EUR/USD", "strategy": "Trend Following", "status": "running", "profit": 12.4, "uptime": "14d 2h"},
            {"name": "Crypto Arb", "pair": "BTC/USD", "strategy": "Arbitrage", "status": "running", "profit": 5.1, "uptime": "4d 12h"},
            {"name": "Gold Mean", "pair": "XAU/USD", "strategy": "Mean Reversion", "status": "stopped", "profit": -1.2, "uptime": "0d 0h"},
            {"name": "Eth Volatility", "pair": "ETH/USD", "strategy": "Scalping", "status": "running", "profit": 8.7, "uptime": "22d 5h"},
        ]
        for agent_data in mock_agents_data:
            new_agent = Agent(**agent_data)
            db.add(new_agent)
        db.commit()

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                # ignore errors on broadcast
                pass

manager = ConnectionManager()

@app.on_event("startup")
async def startup_event():
    # Initialize DB with mock data if needed
    db = next(get_db())
    init_db(db)
    
    # Start Market Simulator
    simulator.add_listener(manager.broadcast)
    simulator.start()

@app.on_event("shutdown")
async def shutdown_event():
    simulator.stop()

@app.get("/")
def read_root():
    return {"message": "TradeX AI API is online."}

@app.get("/api/agents", response_model=List[AgentModel])
def get_agents(db: Session = Depends(get_db)):
    return db.query(Agent).all()

@app.post("/api/agents", response_model=AgentModel)
def create_agent(agent_data: AgentCreateParams, db: Session = Depends(get_db)):
    new_agent = Agent(
        name=agent_data.name,
        pair=agent_data.pair,
        strategy=agent_data.strategy,
        status="stopped",
        profit=0.0,
        uptime="0d 0h"
    )
    db.add(new_agent)
    db.commit()
    db.refresh(new_agent)
    return new_agent

@app.post("/api/agents/{agent_id}/toggle")
def toggle_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent.status = "stopped" if agent.status == "running" else "running"
    db.commit()
    db.refresh(agent)
    return {"message": f"Agent {agent_id} is now {agent.status}", "agent": agent}

@app.get("/api/trades", response_model=List[TradeModel])
def get_trades(db: Session = Depends(get_db)):
    # Return all trades ordered by timestamp desc
    return db.query(Trade).order_by(Trade.timestamp.desc()).all()

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # wait for messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
