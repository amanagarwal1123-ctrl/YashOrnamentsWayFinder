"""
POC Test: LLM Integration for Route Training Assistance
Tests OpenAI GPT via Emergent LLM key for generating:
1. Checkpoint titles from trainer descriptions
2. Navigation instruction improvements
3. Route summaries
4. Warning/landmark descriptions
"""
import asyncio
import os
import sys
from pathlib import Path

import pytest
from dotenv import load_dotenv

# Load env from backend — use relative path for portability
_backend_env = Path(__file__).resolve().parent.parent / 'backend' / '.env'
if _backend_env.exists():
    load_dotenv(_backend_env)
else:
    load_dotenv()  # fall back to process env

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
except ImportError:
    pytest.skip(
        "emergentintegrations is not installed — skipping LLM tests",
        allow_module_level=True,
    )

EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY')
if not EMERGENT_KEY:
    pytest.skip(
        "EMERGENT_LLM_KEY not set in environment — skipping LLM tests",
        allow_module_level=True,
    )


@pytest.mark.asyncio
async def test_checkpoint_title_generation():
    """Generate better checkpoint titles from trainer draft text."""
    chat = LlmChat(
        api_key=EMERGENT_KEY,
        session_id="poc-checkpoint-title-test",
        system_message=(
            "You are a navigation assistant for Chandni Chowk, Delhi. "
            "Generate a short, clear checkpoint title (max 6 words). "
            'Return JSON with keys: "title", "short_instruction", "landmark_hint".'
        ),
    )
    msg = UserMessage(
        text=(
            'Trainer description: "After exiting metro gate 5, walk straight 50m. '
            "Big silver shop on left with blue 'Sharma Silver' sign. "
            'Turn right into narrow lane." Generate JSON.'
        )
    )
    response = await chat.send_message(msg)
    assert len(response) > 10, "Response too short"


@pytest.mark.asyncio
async def test_instruction_improvement():
    """Improve navigation instructions written by trainer."""
    chat = LlmChat(
        api_key=EMERGENT_KEY,
        session_id="poc-instruction-improve-test",
        system_message=(
            "You are a navigation instruction editor for Chandni Chowk. "
            'Return JSON: "improved_instruction", "what_to_look_for", "warning_if_any".'
        ),
    )
    msg = UserMessage(
        text=(
            'Original: "go thru narrow gali after paan shop, silver shops, '
            'keep walking, building with yash complex, go inside" Improve. Return JSON.'
        )
    )
    response = await chat.send_message(msg)
    assert len(response) > 20


@pytest.mark.asyncio
async def test_route_summary_generation():
    """Generate route summary from checkpoints."""
    chat = LlmChat(
        api_key=EMERGENT_KEY,
        session_id="poc-route-summary-test",
        system_message=(
            "Create brief route summaries. "
            'Return JSON: "summary", "estimated_walk_time", "difficulty", "tips".'
        ),
    )
    msg = UserMessage(
        text=(
            'Route "Metro Gate 5 to Yash Complex": 1.Metro Exit 2.Main Road '
            "3.Silver Lane 4.Corner 5.Narrow Lane 6.Building 7.Stairs 8.Office. "
            "Generate summary JSON."
        )
    )
    response = await chat.send_message(msg)
    assert len(response) > 20


@pytest.mark.asyncio
async def test_warning_generation():
    """Generate warnings for confusion points."""
    chat = LlmChat(
        api_key=EMERGENT_KEY,
        session_id="poc-warning-gen-test",
        system_message=(
            "Generate clear warning messages for navigation confusion points. "
            'Return JSON: "warning_text", "what_not_to_do", "recovery_hint".'
        ),
    )
    msg = UserMessage(
        text=(
            "Confusion: TWO similar buildings side by side, both with jewellery shops. "
            "Correct one (Yash Complex) is SECOND, not first. Generate warning JSON."
        )
    )
    response = await chat.send_message(msg)
    assert len(response) > 20
