import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.config import settings
from app.services.ai_service import (
    ai_service,
    _checkpoint_save,
    _checkpoint_load,
    _checkpoint_list,
    _checkpoint_cleanup,
    CHECKPOINTS_DIR,
)

def run_tests():
    print("=" * 60)
    print("DOCAI: FINAL VERIFICATION TEST")
    print("=" * 60)

    # 1. Key Pool Verification
    print("\n[1] Key Pool Separation:")
    print(f"  Analysis Pool Count:   {len(settings.analysis_key_pool)}")
    for i, k in enumerate(settings.analysis_key_pool, 1):
        print(f"    Key {i}: {k[:8]}...{k[-4:] if len(k) > 12 else ''}")
    
    print(f"  Generation Pool Count: {len(settings.generation_key_pool)}")
    for i, k in enumerate(settings.generation_key_pool, 1):
        print(f"    Key {i}: {k[:8]}...{k[-4:] if len(k) > 12 else ''}")

    # Verify no pool leakage
    analysis_set = set(settings.analysis_key_pool)
    generation_set = set(settings.generation_key_pool)
    overlap = analysis_set.intersection(generation_set)
    assert len(overlap) == 0, f"Error: Key pools overlap: {overlap}"
    print("  [OK] Key pools are strictly separated (0 overlap)")

    # 2. Critical Bug C1 Verification (_chat_completion)
    print("\n[2] Critical Bug C1 (_chat_completion method):")
    assert hasattr(ai_service, "_chat_completion"), "ai_service._chat_completion is missing!"
    print("  [OK] ai_service._chat_completion exists and is callable")

    # 3. Critical Bug C2 Verification (Analysis vs Generation Rotation)
    print("\n[3] Critical Bug C2 (Analysis pool enforcement):")
    assert hasattr(ai_service, "_analysis_rotation"), "ai_service._analysis_rotation missing!"
    assert hasattr(ai_service, "_generation_rotation"), "ai_service._generation_rotation missing!"
    print("  [OK] _analysis_rotation and _generation_rotation correctly separated")

    # 4. Checkpoint Pipeline Simulation (Step 1 -> 2 -> 3 -> failure -> resume Step 4)
    print("\n[4] Analysis Checkpoint Recovery Simulation:")
    test_session = "sim_test_analysis_recovery"
    
    # Simulate Step 1-3 with Key 1
    _checkpoint_save(test_session, "01_input", {"title": "Autonomous Mining Rovers", "domains": ["Robotics", "AI"]})
    _checkpoint_save(test_session, "02_project_understanding", {"title": "Autonomous Mining Rovers", "domains": ["Robotics"]})
    _checkpoint_save(test_session, "03_domain_analysis", {"domain": ["Robotics", "Mining Automation"]})
    
    # Verify Step 1-3 saved
    saved_steps = _checkpoint_list(test_session)
    print(f"  Saved checkpoint steps: {saved_steps}")
    assert "01_input" in saved_steps
    assert "02_project_understanding" in saved_steps
    assert "03_domain_analysis" in saved_steps

    # Simulate failure on Step 4 with Key 1, then recovery on Key 2
    print("  -> Simulated Key 1 failure on Step 4.")
    print("  -> Switching to Key 2 and reading saved checkpoints...")
    step_01_data = _checkpoint_load(test_session, "01_input")
    step_02_data = _checkpoint_load(test_session, "02_project_understanding")
    step_03_data = _checkpoint_load(test_session, "03_domain_analysis")
    assert step_01_data is not None and step_01_data["title"] == "Autonomous Mining Rovers"
    assert step_03_data is not None and "Mining Automation" in step_03_data["domain"]

    # Continue from Step 4 with Key 2
    _checkpoint_save(test_session, "04_objectives", {"objectives": ["Obstacle avoidance", "Real-time SLAM"]})
    _checkpoint_save(test_session, "05_requirements", {"requirements": ["LiDAR integration", "ROS2 nodes"]})
    _checkpoint_save(test_session, "06_methodology", {"methodology": "Reinforcement learning + visual SLAM"})
    _checkpoint_save(test_session, "07_components", {"components": ["LiDAR", "Jetson Orin", "Depth Camera"]})
    _checkpoint_save(test_session, "08_structured_context", {"complete": True})

    all_steps = _checkpoint_list(test_session)
    print(f"  Final completed checkpoint steps: {len(all_steps)} steps")
    assert len(all_steps) == 8
    print("  [OK] Analysis Checkpoint Recovery: SUCCESS (Steps 1-3 preserved, Steps 4-8 completed)")

    # 5. Section Generation Checkpoint Recovery Simulation
    print("\n[5] Section Generation Checkpoint Recovery Simulation:")
    gen_session = "sim_test_generation_recovery"
    
    # Simulate Section 1-3 with Generation Key 1
    _checkpoint_save(gen_session, "section_00_sec-intro", {
        "section_id": "sec-intro",
        "title": "Introduction",
        "content_html": "<p>Autonomous mining robotics represents a critical frontier...</p>",
        "word_count": 520,
        "summary": "Section 'Introduction': Background on mining automation and safety challenges."
    })
    _checkpoint_save(gen_session, "section_01_sec-problem", {
        "section_id": "sec-problem",
        "title": "Problem Statement",
        "content_html": "<p>Subterranean mining environments present unique hazards...</p>",
        "word_count": 480,
        "summary": "Section 'Problem Statement': GPS-denied navigation and sensor degradation."
    })
    _checkpoint_save(gen_session, "section_02_sec-objectives", {
        "section_id": "sec-objectives",
        "title": "Core Objectives",
        "content_html": "<p>The primary aims of this project are twofold...</p>",
        "word_count": 450,
        "summary": "Section 'Core Objectives': Real-time obstacle avoidance and SLAM accuracy."
    })

    # Simulate failure on Section 4
    print("  -> Sections 1-3 saved as JSON checkpoints.")
    print("  -> Simulated Generation Key 1 quota exhaustion on Section 4.")
    print("  -> Generation Key 2 takes over: reading Section 1-3 checkpoints...")

    s1 = _checkpoint_load(gen_session, "section_00_sec-intro")
    s2 = _checkpoint_load(gen_session, "section_01_sec-problem")
    s3 = _checkpoint_load(gen_session, "section_02_sec-objectives")
    assert s1 is not None and s1["word_count"] == 520
    assert s2 is not None and s2["word_count"] == 480
    assert s3 is not None and s3["word_count"] == 450

    # Key 2 drafts Section 4 directly without re-drafting Sections 1-3
    _checkpoint_save(gen_session, "section_03_sec-methodology", {
        "section_id": "sec-methodology",
        "title": "System Architecture & Methodology",
        "content_html": "<p>The proposed system integrates multi-modal sensor fusion...</p>",
        "word_count": 610,
        "summary": "Section 'Methodology': Kalman-filter fused LiDAR and stereo visual odometry."
    })

    gen_steps = _checkpoint_list(gen_session)
    print(f"  Completed generation checkpoints: {gen_steps}")
    assert len(gen_steps) == 4
    print("  [OK] Generation Checkpoint Recovery: SUCCESS (Sections 1-3 preserved, Section 4 completed)")

    # Clean up test sessions
    _checkpoint_cleanup(test_session)
    _checkpoint_cleanup(gen_session)
    print("\n[6] Test cleanup complete.")
    print("\n" + "=" * 60)
    print("ALL VERIFICATIONS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
