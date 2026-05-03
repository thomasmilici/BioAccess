from config import settings


def compute_confidence(components: dict) -> float:
    """
    C = w1·sim + w2·stab + w3·qual + w4·live + w5·geom

    All values must be in [0, 1].
    """
    sim = components.get("sim", 0)
    stab = components.get("stab", 0)
    qual = components.get("qual", 0)
    live = components.get("live", 0)
    geom = components.get("geom", 0)

    confidence = (
        sim * settings.W1_SIMILARITY
        + stab * settings.W2_STABILITY
        + qual * settings.W3_QUALITY
        + live * settings.W4_LIVENESS
        + geom * settings.W5_GEOMETRY
    )

    return round(confidence, 4)


def compute_components_detailed(sim: float, stab: float, qual: float, live: float, geom: float) -> list[dict]:
    """Returns sub-step details for the confidence stage."""
    return [
        {
            "name": "w1·sim",
            "status": "completed",
            "detail": f"{settings.W1_SIMILARITY:.2f} × {sim:.3f} = {(settings.W1_SIMILARITY * sim):.3f}",
        },
        {
            "name": "w2·stab",
            "status": "completed",
            "detail": f"{settings.W2_STABILITY:.2f} × {stab:.3f} = {(settings.W2_STABILITY * stab):.3f}",
        },
        {
            "name": "w3·qual",
            "status": "completed",
            "detail": f"{settings.W3_QUALITY:.2f} × {qual:.3f} = {(settings.W3_QUALITY * qual):.3f}",
        },
        {
            "name": "w4·live",
            "status": "completed",
            "detail": f"{settings.W4_LIVENESS:.2f} × {live:.3f} = {(settings.W4_LIVENESS * live):.3f}",
        },
        {
            "name": "w5·geom",
            "status": "completed",
            "detail": f"{settings.W5_GEOMETRY:.2f} × {geom:.3f} = {(settings.W5_GEOMETRY * geom):.3f}",
        },
    ]


def decide(confidence: float, turnstile_type: str) -> dict:
    """
    Decision logic:
      confidence >= TH_HIGH  → granted (Early Exit)
      TH_LOW <= conf < TH_HIGH → review (Fallback Static)
      confidence < TH_LOW      → denied (Escalation)
    """
    thresholds = settings.THRESHOLDS.get(turnstile_type, {"low": 0.85, "high": 0.95})
    th_low = thresholds["low"]
    th_high = thresholds["high"]

    if confidence >= th_high:
        return {
            "decision": "granted",
            "decision_label": "EARLY_EXIT — Accesso automatico immediato",
            "thresholds": thresholds,
        }
    elif confidence >= th_low:
        return {
            "decision": "review",
            "decision_label": "FALLBACK_STATIC — Accesso con monitoraggio",
            "thresholds": thresholds,
        }
    else:
        return {
            "decision": "denied",
            "decision_label": "ESCALATION — Supervisione umana richiesta",
            "thresholds": thresholds,
        }
