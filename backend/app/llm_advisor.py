"""
LLM Advisor module for Industrial Acoustic Anomaly Detection.
Uses Google Gemini API to generate:
1. Root causes of the acoustic anomaly
2. Possible immediate solutions
3. Long-term preventive measures
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Fallback domain-expert knowledge base when Gemini API key is not yet configured
FALLBACK_ADVISORY = {
    "pump": {
        "summary": "Acoustic residuals indicate hydraulic imbalance and localized high-frequency cavitation inside the impeller housing.",
        "root_causes": [
            "Fluid cavitation caused by insufficient Net Positive Suction Head (NPSHa) or clogged suction strainer.",
            "Impeller vane erosion or debris entrapment leading to dynamic hydraulic imbalance.",
            "Bearing raceway fatigue and micro-spalling in the drive-end bearing assembly.",
            "Shaft misalignment causing cyclic 1X/2X rotational vibration harmonics."
        ],
        "possible_solutions": [
            "Throttling discharge valve to stabilize suction pressure and verify suction line vacuum gauge readings.",
            "Inspect and clear the suction inlet strainer and intake pipe for partial obstructions.",
            "Check pump bearing temperatures using an infrared pyrometer; replenish ISO VG 68 lubrication if dry.",
            "Perform laser shaft alignment check between pump and electric motor coupling."
        ],
        "preventive_measures": [
            "Establish continuous acoustic emission and vibration threshold monitoring at 1-month baseline intervals.",
            "Implement automated NPSH margin alarms linked to the supervisory control system (SCADA).",
            "Follow strict ISO 10816-3 vibration severity standards during routine weekly plant rounds.",
            "Enforce a 2,000-operating-hour mechanical seal and bearing inspection protocol."
        ]
    },
    "valve": {
        "summary": "Acoustic residuals detect high-frequency sonic turbulence consistent with an internal seal leak and spool stiction.",
        "root_causes": [
            "Elastomeric seat degradation or particulate scoring permitting pressurized medium bypass (internal air leak).",
            "Spool varnishing and particulate accumulation causing mechanical stiction during stroke cycles.",
            "Pilot pressure instability or weakened return spring causing spool oscillation and flutter.",
            "Actuator diaphragm micro-perforation resulting in incomplete valve seating."
        ],
        "possible_solutions": [
            "Perform an ultrasonic listening probe sweep across the valve body to pinpoint the exact leak orifice.",
            "Cycle the valve manually 3 to 5 times under no-load to dislodge transient particulate entrapment.",
            "Verify pilot pneumatic/hydraulic supply pressure matches the nameplate specification (e.g., 6.0 bar).",
            "Isolate valve line and inspect the soft seat ring and O-rings for erosion or hardening."
        ],
        "preventive_measures": [
            "Install 5-micron inline coalescing air filters upstream to prevent particulate ingress and oil varnishing.",
            "Calibrate valve stroke time and pressure differential telemetry into the digital maintenance log.",
            "Schedule quarterly ultrasonic leak audits on all critical pneumatic manifolds.",
            "Replace elastomeric seals on a scheduled 12-month preventative maintenance cycle."
        ]
    },
    "fan": {
        "summary": "Acoustic residuals show low-frequency rotor imbalance combined with high-frequency aerodynamic blade pass friction.",
        "root_causes": [
            "Particulate buildup or uneven dirt accumulation on centrifugal/axial fan blades causing dynamic unbalance.",
            "Pillow-block bearing race wear or inadequate lubrication leading to elevated metal-to-metal contact noise.",
            "Loosened foundation hold-down bolts or degraded anti-vibration damping isolators.",
            "Belt tension degradation or pulley misalignment generating harmonic belt slap and friction."
        ],
        "possible_solutions": [
            "Safely lock out/tag out (LOTO) the fan and pressure-wash or scrape dirt build-up off all impeller blades.",
            "Inspect pillow block bearings for grease contamination; purge and relubricate with high-speed synthetic grease.",
            "Torque all structural anchor bolts and motor mounting fasteners to manufacturer specs.",
            "Check drive belt tension and alignment using a dual-laser pulley alignment tool."
        ],
        "preventive_measures": [
            "Conduct dynamic in-situ dual-plane rotor balancing to achieve ISO 1940 Grade G2.5 compliance.",
            "Install automated continuous broadband acoustic sensors on bearing housings for early micro-fault alerts.",
            "Enforce monthly blade cleaning and aerodynamic intake filter replacement schedules.",
            "Set automated temperature and acoustic threshold alarms in the edge monitoring dashboard."
        ]
    }
}


def get_gemini_client(api_key: Optional[str] = None):
    """Initializes and returns the Google GenAI client if an API key is available."""
    # Ensure backend/.env or .env is refreshed
    for p in ["backend/.env", ".env"]:
        if os.path.exists(p):
            load_dotenv(p, override=True)

    resolved_key = (
        api_key
        or os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
    )
    if not resolved_key:
        return None

    try:
        from google import genai
        return genai.Client(api_key=resolved_key)
    except Exception as e:
        logger.error(f"Failed to initialize google-genai Client: {e}")
        return None


def generate_anomaly_advice(
    machine_type: str,
    score: float,
    threshold: float,
    z_score: float,
    primary_defect: str,
    frequency_bands: List[Dict[str, Any]] = None,
    api_key_override: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generates structured maintenance advice using Gemini LLM or expert rule fallback.
    """
    target_machine = (machine_type or "pump").lower().strip()
    frequency_bands = frequency_bands or []

    # Format band residuals for the prompt
    band_lines = []
    for b in frequency_bands:
        band_lines.append(
            f"  - {b.get('name', 'Band')}: Error={b.get('error', 0):.4f}, "
            f"Threshold={b.get('threshold', 0):.4f}, Anomaly={b.get('is_anomaly', False)} "
            f"({b.get('diagnostic', '')})"
        )
    bands_text = "\n".join(band_lines) if band_lines else "  - No individual band telemetry available"

    client = get_gemini_client(api_key=api_key_override)

    if client:
        prompt = f"""You are an expert Senior Industrial Reliability Engineer and Acoustic Vibration Analyst.
You have just received real-time acoustic telemetry and reconstruction residuals from a TinyML Autoencoder edge sensor monitoring an industrial {target_machine.upper()}.

TELEMETRY DATA:
- Machine Asset: {target_machine.upper()}
- Autoencoder MSE Error: {score:.4f} (Adaptive Threshold: {threshold:.4f})
- Deviation (Z-Score): {z_score:+.2f}σ
- Flagged Acoustic Defect Band: {primary_defect}
- Frequency Residual Breakdown:
{bands_text}

Task:
Provide an expert industrial diagnosis in JSON format with exactly the following keys:
1. "summary": A 1-2 sentence high-level overview of the machine's acoustic health state.
2. "root_causes": A list of 3-4 specific mechanical/fluid/electrical root causes explaining WHY this frequency anomaly occurred in this {target_machine}.
3. "possible_solutions": A list of 3-4 immediate corrective maintenance actions the technician should take on the factory floor right now.
4. "preventive_measures": A list of 3-4 long-term preventive measures to avoid recurrence (e.g., condition monitoring, lubrication schedule, alignment checks, operating envelope adjustments).

IMPORTANT: Return ONLY raw, valid JSON. Do not wrap in markdown code blocks."""

        # Use Gemini 3.5 Flash as primary model
        candidate_models = ["gemini-3.5-flash", "gemini-flash-latest"]
        last_error = None
        for model_name in candidate_models:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )
                text = response.text.strip()
                # Clean up if markdown code fence is returned
                if text.startswith("```json"):
                    text = text[7:]
                if text.startswith("```"):
                    text = text[3:]
                if text.endswith("```"):
                    text = text[:-3]
                text = text.strip()

                parsed = json.loads(text)
                return {
                    "status": "success",
                    "source": "gemini",
                    "model_used": "Gemini 3.5 Flash",
                    "advice": {
                        "summary": parsed.get("summary", ""),
                        "root_causes": parsed.get("root_causes", []),
                        "possible_solutions": parsed.get("possible_solutions", []),
                        "preventive_measures": parsed.get("preventive_measures", []),
                    }
                }
            except Exception as e:
                logger.warning(f"Gemini model {model_name} invocation error: {e}")
                last_error = str(e)
                continue

    # Fallback to pre-calibrated domain expert rules
    base = FALLBACK_ADVISORY.get(target_machine, FALLBACK_ADVISORY["pump"])
    return {
        "status": "success",
        "source": "expert_rules",
        "model_used": "Domain-Calibrated Industrial Rules Engine (Add GEMINI_API_KEY for live LLM)",
        "advice": {
            "summary": f"[{target_machine.upper()} Telemetry {score:.4f} MSE / {z_score:+.1f}σ]: {base['summary']}",
            "root_causes": base["root_causes"],
            "possible_solutions": base["possible_solutions"],
            "preventive_measures": base["preventive_measures"],
        }
    }
