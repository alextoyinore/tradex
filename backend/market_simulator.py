import asyncio
import json
import random
import datetime
import pandas as pd
import pandas_ta as ta
from typing import Callable, Coroutine
from database import SessionLocal
from models import Agent, Trade

MOCK_MARKETS = [
    {"pair": "EUR/USD", "type": "Forex", "price": 1.0845, "change": 0.24, "volume": "2.4B", "volatility": 0.0005},
    {"pair": "GBP/USD", "type": "Forex", "price": 1.2630, "change": -0.12, "volume": "1.8B", "volatility": 0.0006},
    {"pair": "USD/JPY", "type": "Forex", "price": 150.20, "change": 0.45, "volume": "3.1B", "volatility": 0.05},
    {"pair": "BTC/USD", "type": "Crypto", "price": 64230.00, "change": 4.20, "volume": "45.2B", "volatility": 150.0},
    {"pair": "ETH/USD", "type": "Crypto", "price": 3450.50, "change": 5.10, "volume": "18.4B", "volatility": 25.0},
    {"pair": "XAU/USD", "type": "Commodity", "price": 2024.30, "change": -0.80, "volume": "1.2M", "volatility": 1.5},
    {"pair": "WTI Oil", "type": "Commodity", "price": 76.80, "change": 1.20, "volume": "3.4M", "volatility": 0.2},
]

class MarketSimulator:
    def __init__(self):
        self.markets = MOCK_MARKETS.copy()
        self.listeners = []
        self._running = False
        self._task = None
        
        # History for technical analysis (30 units with variance)
        self.history = {}
        for m in self.markets:
            pair = m["pair"]
            base = m["price"]
            vol = m["volatility"] * 10
            # Seed with 30 stochastic points
            self.history[pair] = [base + random.uniform(-vol, vol) for _ in range(30)]
        
        # Multi-timeframe OHLCV data
        import time
        current_ts = int(time.time())
        self.resolutions = {"1m": 60, "5m": 300, "15m": 900, "1h": 3600}
        self.candles = {}
        
        for m in self.markets:
            pair = m["pair"]
            base_p = m["price"]
            self.candles[pair] = {}
            for res_name, seconds in self.resolutions.items():
                res_candles = []
                # Seed some history
                start_ts = current_ts - (seconds * 30)
                for i in range(30):
                    res_candles.append({
                        "time": start_ts + (i * seconds),
                        "open": base_p,
                        "high": base_p * 1.001,
                        "low": base_p * 0.999,
                        "close": base_p
                    })
                self.candles[pair][res_name] = res_candles
            
    def add_listener(self, listener: Callable[[str], Coroutine]):
        self.listeners.append(listener)

    def remove_listener(self, listener: Callable[[str], Coroutine]):
        if listener in self.listeners:
            self.listeners.remove(listener)

    def evaluate_agents(self, db, pair, current_price, updates_payload, market_price):
        # Retrieve history and create a Series for Pandas
        prices = self.history[pair]
        if len(prices) < 15:
            return  # Not enough data
            
        df = pd.DataFrame(prices, columns=['close'])
        
        # Fetch running agents for this pair from the database
        running_agents = db.query(Agent).filter(Agent.status == "running", Agent.pair == pair).all()
        
        for agent in running_agents:
            signal = None
            
            try:
                # Dynamic Logic based on Strategy
                if agent.strategy == "Mean Reversion":
                    # RSI: oversold → BUY, overbought → SELL
                    if len(df) > 15:
                        rsi = ta.rsi(df['close'], length=14)
                        if rsi is not None and not rsi.empty:
                            current_rsi = rsi.iloc[-1]
                            if current_rsi > 70:
                                signal = "SELL"
                            elif current_rsi < 30:
                                signal = "BUY"

                elif agent.strategy == "Trend Following":
                    # SMA crossover
                    if len(df) > 20:
                        sma_fast = ta.sma(df['close'], length=9)
                        sma_slow = ta.sma(df['close'], length=21)
                        if sma_fast is not None and sma_slow is not None and len(sma_fast) >= 2 and len(sma_slow) >= 2:
                            if sma_fast.iloc[-1] > sma_slow.iloc[-1] and sma_fast.iloc[-2] <= sma_slow.iloc[-2]:
                                signal = "BUY"
                            elif sma_fast.iloc[-1] < sma_slow.iloc[-1] and sma_fast.iloc[-2] >= sma_slow.iloc[-2]:
                                signal = "SELL"

                elif agent.strategy == "Scalping":
                    # EMA momentum scalp
                    if len(df) > 10:
                        ema = ta.ema(df['close'], length=8)
                        if ema is not None and not ema.empty:
                            if market_price > ema.iloc[-1] * 1.0005:
                                signal = "BUY"
                            elif market_price < ema.iloc[-1] * 0.9995:
                                signal = "SELL"

                elif agent.strategy == "Smart Money (SMC/ICT)":
                    # FVG Detection (Fair Value Gap)
                    series = self.candles[pair]["1m"]
                    if len(series) >= 3:
                        c1, c2, c3 = series[-3], series[-2], series[-1]
                        # Bullish FVG: Low of C3 > High of C1
                        if c3["low"] > c1["high"]:
                            signal = "BUY"
                        # Bearish FVG: High of C3 < Low of C1
                        elif c3["high"] < c1["low"]:
                            signal = "SELL"

                elif agent.strategy == "Arbitrage":
                    # Simple random signal to simulate arb opportunities
                    if random.random() < 0.05:  # 5% chance per tick
                        signal = random.choice(["BUY", "SELL"])

            except Exception as agent_err:
                print(f"[agent eval error] agent={agent.name} strategy={agent.strategy}: {agent_err}")
                continue
                            
            if signal:
                # Update agent profit in DB
                modifier = random.uniform(0.1, 0.5)
                if signal == "BUY": agent.profit += modifier
                else: agent.profit -= modifier
                agent.profit = round(agent.profit, 2)
                
                # Log Trade in DB
                new_trade = Trade(
                    agent_id=agent.id,
                    pair=pair,
                    type=signal,
                    price=float(current_price.replace(',', ''))
                )
                db.add(new_trade)
                db.commit()

                updates_payload.append({
                    "event_type": "agent_signal",
                    "agent_id": agent.id,
                    "agent_name": agent.name,
                    "pair": pair,
                    "signal": signal,
                    "price": current_price,
                    "new_profit": agent.profit,
                    "timestamp": datetime.datetime.utcnow().isoformat()
                })

    async def _simulate_ticks(self):
        import time
        while self._running:
            try:
                await asyncio.sleep(1.0) # Tick every second
                
                updates = []
                current_time = int(time.time())
                
                # Use SessionLocal to query database
                db = SessionLocal()
                try:
                    for market in self.markets:
                        if random.random() > 0.3: # 70% chance to tick
                            vol = market["volatility"]
                            change_amt = random.uniform(-vol, vol)
                            market["price"] = max(0.0001, market["price"] + change_amt)
                            
                            pair = market["pair"]
                            # Update history array
                            self.history[pair].append(market["price"])
                            if len(self.history[pair]) > 100:
                                self.history[pair].pop(0)
                            
                            if market["type"] == "Crypto":
                                price_str = f"{market['price']:,.2f}"
                            elif market["type"] == "Forex" and market["pair"] != "USD/JPY":
                                price_str = f"{market['price']:.4f}"
                            else:
                                price_str = f"{market['price']:,.2f}"

                            # Update all resolutions
                            tf_payload = {}
                            for res_name, seconds in self.resolutions.items():
                                series = self.candles[pair][res_name]
                                active_candle = series[-1]
                                
                                # If interval rolled over, create a new candle
                                if current_time - active_candle["time"] >= seconds:
                                    active_candle = {
                                        "time": (current_time // seconds) * seconds,
                                        "open": active_candle["close"],
                                        "high": market["price"],
                                        "low": market["price"],
                                        "close": market["price"]
                                    }
                                    series.append(active_candle)
                                    if len(series) > 100: series.pop(0)
                                else:
                                    active_candle["close"] = market["price"]
                                    active_candle["high"] = max(active_candle["high"], market["price"])
                                    active_candle["low"] = min(active_candle["low"], market["price"])
                                
                                tf_payload[res_name] = {
                                    "active": active_candle,
                                    "series": series
                                }

                            # Run Algorithm Brain BEFORE appending tick, so agent signals 
                            # are separate events and don't overwrite market tick data
                            agent_signals = []
                            self.evaluate_agents(db, pair, price_str, agent_signals, market["price"])

                            updates.append({
                                "pair": pair,
                                "type": market["type"],
                                "price": price_str,
                                "change": market["change"],
                                "volume": market["volume"],
                                "event_type": "market_tick",
                                "timeframes": tf_payload
                            })

                            # Merge agent signals into the update batch
                            updates.extend(agent_signals)
                    
                    if updates and self.listeners:
                        msg = json.dumps({"type": "market_updates", "data": updates})
                        for listener in self.listeners:
                            asyncio.create_task(listener(msg))
                finally:
                    db.close() # Always close the session
            except asyncio.CancelledError:
                break
            except Exception as tick_err:
                print(f"[tick loop error] {tick_err}")
                await asyncio.sleep(1.0)  # Back off briefly, then continue

    def start(self):
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._simulate_ticks())

    def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()

simulator = MarketSimulator()
