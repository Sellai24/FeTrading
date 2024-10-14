##This agent use a trained model to predict the price of a cryptocurrency 
#So other agents can use this information to make trading decisions
import logging
import joblib
from uagents import Agent, Context, Model
from typing import Dict

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Models for requests and responses
class UserRequest(Model):
    question: str

class AgentResponse(Model):
    recommendation: str
    explanation: str

# Initialize trading agent
trading_agent = Agent(
    name="trading_agent",
    port=8000,
    endpoint=["http://127.0.0.1:8000/submit"],
)

@trading_agent.on_message(model=UserRequest)
async def handle_request(ctx: Context, sender: str, msg: UserRequest):
    """Handle incoming user questions."""
    try:
        
        # For privacy and security reasons, we will not disclose the specific details of our trading bot
        # Our system uses advanced AI trained on historical cryptocurrency and traditional finance data
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
        
        #if you want to test it you must have your own model and change the code below
        trained_model = joblib.load('fitted_model.pkl')
        
        # Prepare the input data for prediction
        # This should be based on the question or relevant market data
        input_data = prepare_input_data(msg.question)
        
        # Make predictions using the loaded model
        predictions = trained_model.predict(input_data)
        
        # Interpret the predictions
        recommendation, explanation = interpret_predictions(predictions)

        if not predictions:
            recommendation = "insufficient information"
            explanation = "More specific information is needed about the asset in question."

        if predictions >= 0.5:
            recommendation = "buy"
            explanation = "The model recommends buying based on the given data with probability: " + str(predictions)
        else:
            recommendation = "sell"
            explanation = "The model recommends selling based on the given data with probability: " + str(predictions)
    
        await ctx.send(sender, AgentResponse(recommendation=recommendation, explanation=explanation))

    except Exception as e:
        logger.error(f"Error processing request: {e}")
        await ctx.send(sender, AgentResponse(recommendation="error", explanation="An unexpected error occurred"))

if __name__ == "__main__":
    trading_agent.run()



