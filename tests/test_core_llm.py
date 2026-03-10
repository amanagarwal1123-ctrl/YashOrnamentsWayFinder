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
import json
from pathlib import Path
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
    print("SKIP: emergentintegrations is not installed. Install it to run LLM tests.")
    sys.exit(0)

EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY')
if not EMERGENT_KEY:
    print("SKIP: EMERGENT_LLM_KEY not set in environment.")
    sys.exit(0)


async def test_checkpoint_title_generation():
    """Test: Generate better checkpoint titles from trainer draft text"""
    print("\n=== TEST 1: Checkpoint Title Generation ===")
    try:
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id="poc-checkpoint-title-test",
            system_message=(
                "You are a navigation assistant for Chandni Chowk, Delhi. "
                "You help generate clear, concise checkpoint titles for a jewellery store navigation app. "
                "Given a trainer's description of a checkpoint location, generate a short, clear title (max 6 words). "
                'Return ONLY a JSON object with keys: "title", "short_instruction", "landmark_hint".'
            ),
        )

        msg = UserMessage(
            text=(
                'Trainer description: "After exiting metro gate 5, walk straight about 50 meters. '
                "There's a big silver jewelry shop on the left with a blue sign that says 'Sharma Silver'. "
                'Turn right at this shop into a narrow lane."\n\n'
                "Generate a checkpoint title, short instruction, and landmark hint as JSON."
            )
        )

        response = await chat.send_message(msg)
        print(f"Response: {response}")
        assert len(response) > 10, "Response too short"
        print("PASSED: Checkpoint title generation works")
        return True
    except Exception as e:
        print(f"FAILED: {e}")
        return False


async def test_instruction_improvement():
    """Test: Improve navigation instructions written by trainer"""
    print("\n=== TEST 2: Instruction Improvement ===")
    try:
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id="poc-instruction-improve-test",
            system_message=(
                "You are a navigation instruction editor for a Chandni Chowk navigation app. "
                "Given rough trainer instructions, produce clearer, customer-friendly navigation text. "
                'Return JSON with keys: "improved_instruction", "what_to_look_for", "warning_if_any".'
            ),
        )

        msg = UserMessage(
            text=(
                'Original trainer instruction: "go thru the narrow gali after the paan shop, '
                "there will be many shops selling silver stuff, keep walking dont turn, "
                'you will see a building with yash complex written, go inside"\n\n'
                "Improve this instruction for a first-time visitor. Return JSON."
            )
        )

        response = await chat.send_message(msg)
        print(f"Response: {response}")
        assert len(response) > 20, "Response too short"
        print("PASSED: Instruction improvement works")
        return True
    except Exception as e:
        print(f"FAILED: {e}")
        return False


async def test_route_summary_generation():
    """Test: Generate route summary from list of checkpoints"""
    print("\n=== TEST 3: Route Summary Generation ===")
    try:
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id="poc-route-summary-test",
            system_message=(
                "You are a navigation assistant that creates brief route summaries. "
                "Given a list of checkpoints, generate a customer-friendly route summary. "
                'Return JSON with keys: "summary", "estimated_walk_time", "difficulty", "tips".'
            ),
        )

        msg = UserMessage(
            text=(
                'Route: "Metro Gate 5 to Yash Complex"\n'
                "Checkpoints:\n"
                "1. Metro Gate 5 Exit\n2. Chandni Chowk Main Road (turn right)\n"
                "3. Silver Market Lane Entry\n4. Sharma Silver Shop Corner (turn right)\n"
                "5. Narrow Lane with jewellery shops\n6. Yash Complex Building Entrance\n"
                "7. Building Stairs/Lift to 5th Floor\n8. Office Door - Destination\n\n"
                "Generate a route summary. Return JSON."
            )
        )

        response = await chat.send_message(msg)
        print(f"Response: {response}")
        assert len(response) > 20, "Response too short"
        print("PASSED: Route summary generation works")
        return True
    except Exception as e:
        print(f"FAILED: {e}")
        return False


async def test_warning_generation():
    """Test: Generate warnings for confusion points"""
    print("\n=== TEST 4: Warning/Confusion Point Generation ===")
    try:
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id="poc-warning-gen-test",
            system_message=(
                "You are a navigation safety assistant for Chandni Chowk. "
                "Given a confusion point description, generate a clear warning message for customers. "
                'Return JSON with keys: "warning_text", "what_not_to_do", "recovery_hint".'
            ),
        )

        msg = UserMessage(
            text=(
                'Confusion point: "After entering the narrow lane, there are TWO similar-looking '
                "buildings side by side. Both have jewellery shops on ground floor. The correct building "
                "(Yash Complex) is the SECOND one, not the first. Many customers enter the first building "
                'by mistake."\n\nGenerate a warning message. Return JSON.'
            )
        )

        response = await chat.send_message(msg)
        print(f"Response: {response}")
        assert len(response) > 20, "Response too short"
        print("PASSED: Warning generation works")
        return True
    except Exception as e:
        print(f"FAILED: {e}")
        return False


async def main():
    print("=" * 60)
    print("POC: LLM Integration for Route Training Assistance")
    print(f"Using Emergent LLM Key: {EMERGENT_KEY[:15]}...")
    print("=" * 60)

    results = []
    results.append(await test_checkpoint_title_generation())
    results.append(await test_instruction_improvement())
    results.append(await test_route_summary_generation())
    results.append(await test_warning_generation())

    print("\n" + "=" * 60)
    print(f"RESULTS: {sum(results)}/{len(results)} tests passed")
    if all(results):
        print("ALL POC TESTS PASSED - LLM integration verified!")
    else:
        print("SOME TESTS FAILED - needs investigation")
    print("=" * 60)
    return all(results)


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
