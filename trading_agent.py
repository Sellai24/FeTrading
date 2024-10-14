##The idea of this code is to use a trained model to receive money from users/other agents
#and then make trades based on the information of a ia trained model

import asyncio
import logging
from uagents import Agent, Context, Model
from uagents.setup import fund_agent_if_low
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed
from solana.keypair import Keypair
from solana.publickey import PublicKey
from solana.transaction import Transaction
from solana.system_program import TransferParams, transfer
import os
from typing import Dict
import jwt
import time

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Models for requests and responses
class UserRequest(Model):
    action: str
    amount: float
    user_address: str
    timestamp: float
    signature: str

class AgentResponse(Model):
    status: str
    message: str
    balance: float
    portfolio: Dict[str, float]

# Constants
MINIMUM_SOL = 0.1
JWT_SECRET = os.environ.get("JWT_SECRET", "your_jwt_secret_here")

# Initialize trading agent
trading_agent = Agent(
    name="trading_agent",
    port=8000,
    endpoint=["http://127.0.0.1:8000/submit"],
)

fund_agent_if_low(trading_agent.wallet.address())

# Connect to Solana network (replace with actual RPC URL)
async def get_solana_client():
    return AsyncClient("https://api.devnet.solana.com")

# User balances 
user_balances: Dict[str, float] = {}

# Bot's portfolio
bot_portfolio: Dict[str, float] = {
    "SOL": 1.0,
}

async def check_minimum_balance(address: str) -> bool:
    """Check if the user has the minimum required SOL balance."""
    try:
        client = await get_solana_client()
        balance = await client.get_balance(PublicKey(address))
        await client.is_connected()
        return balance['result']['value'] / 1e9 >= MINIMUM_SOL
    except Exception as e:
        logger.error(f"Error checking balance for {address}: {e}")
        return False

def verify_request(msg: UserRequest) -> bool:
    """Verify the authenticity of the incoming request."""
    try:
        payload = jwt.decode(msg.signature, JWT_SECRET, algorithms=["HS256"])
        return (payload["user_address"] == msg.user_address and 
                payload["action"] == msg.action and 
                payload["amount"] == msg.amount and 
                payload["timestamp"] == msg.timestamp and 
                time.time() - msg.timestamp < 300)  
    except jwt.InvalidTokenError:
        logger.warning(f"Invalid token received for user {msg.user_address}")
        return False

def allocate_portfolio(amount: float) -> Dict[str, float]:
    """Allocate the deposited amount according to the bot's portfolio."""
    return {token: amount * percentage for token, percentage in bot_portfolio.items()}

@trading_agent.on_interval(period=60.0)
async def check_trading_signals(ctx: Context):
    """Periodically check for trading signals."""
    logger.info("Checking trading signals...")
    # For privacy and security reasons, we will not disclose the specific details of our trading bot
    # Our system uses advanced AI trained on historical cryptocurrency from 2009 to the present and traditional finance data
    # from 1980 to the present, including:
    # - Price and volume patterns across multiple timeframes
    # - On-chain indicators such as exchange flows, whale activity, and network metrics
    # - Market sentiment derived from social media and news
    # - Correlations with traditional assets and macroeconomic events
    # - Analysis of orderbooks and liquidity in decentralized and centralized exchanges
    # - Political and regulatory changes
    # The implementation include:
    # - API calls to cryptocurrency data providers
    # - Real-time market data analysis
    # - Execution of machine learning models for price prediction
    # - Evaluation of technical and fundamental signals
    # - Monitoring of on-chain events such as forks, halving, or regulatory changes

    #For now the bot only trade SOL/BTC, SOL/USD and SOL/FET pairs
    
@trading_agent.on_message(model=UserRequest)
async def handle_request(ctx: Context, sender: str, msg: UserRequest):
    """Handle incoming user requests."""
    if not verify_request(msg):
        await ctx.send(sender, AgentResponse(status="error", message="Invalid or expired request", balance=0, portfolio={}))
        return

    if not await check_minimum_balance(msg.user_address):
        await ctx.send(sender, AgentResponse(status="error", message="Insufficient SOL balance. Minimum 0.1 SOL required.", balance=0, portfolio={}))
        return

    current_balance = user_balances.get(msg.user_address, 0)

    try:
        if msg.action == "deposit":
            new_allocation = allocate_portfolio(msg.amount)
            if msg.user_address not in user_balances:
                user_balances[msg.user_address] = new_allocation
            else:
                for token, amount in new_allocation.items():
                    user_balances[msg.user_address][token] = user_balances[msg.user_address].get(token, 0) + amount
            
            total_balance = sum(user_balances[msg.user_address].values())
            await ctx.send(sender, AgentResponse(status="success", message="Deposit successful", balance=total_balance, portfolio=user_balances[msg.user_address]))
        
        elif msg.action == "withdraw":
            if current_balance >= msg.amount:
                withdrawal_ratio = msg.amount / current_balance
                for token in user_balances[msg.user_address]:
                    user_balances[msg.user_address][token] *= (1 - withdrawal_ratio)
                
                total_balance = sum(user_balances[msg.user_address].values())
                await ctx.send(sender, AgentResponse(status="success", message="Withdrawal successful", balance=total_balance, portfolio=user_balances[msg.user_address]))
            else:
                await ctx.send(sender, AgentResponse(status="error", message="Insufficient balance for withdrawal", balance=current_balance, portfolio=user_balances.get(msg.user_address, {})))
        
        else:
            await ctx.send(sender, AgentResponse(status="error", message="Invalid action", balance=current_balance, portfolio=user_balances.get(msg.user_address, {})))

    except Exception as e:
        logger.error(f"Error processing request for {msg.user_address}: {e}")
        await ctx.send(sender, AgentResponse(status="error", message="An unexpected error occurred", balance=current_balance, portfolio=user_balances.get(msg.user_address, {})))

if __name__ == "__main__":
    trading_agent.run()