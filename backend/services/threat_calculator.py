"""
ARGUS SKY - Threat Score Calculator
위협 점수 계산 서비스 + 상세 로깅
"""
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import random

from config import CATEGORY_WEIGHTS, DATA_SOURCES, THREAT_LEVELS

# =============================================================================
# Constants
# =============================================================================

SOURCE_CREDIBILITY = {k: v["credibility"] for k, v in DATA_SOURCES.items()}

LEVEL_NAMES = {level: config["name"] for level, config in THREAT_LEVELS.items()}

# =============================================================================
# Threat Calculator Class
# =============================================================================

class ThreatCalculator:
    """위협 점수 계산기 - 상세 계산 로그 포함"""
    
    def calculate_temporal_factor(self, created_at: datetime) -> Tuple[float, dict]:
        """
        시간 경과에 따른 위협 감쇠 계수 계산
        
        Returns:
            (factor, calculation_details)
        """
        now = datetime.utcnow()
        hours_ago = (now - created_at).total_seconds() / 3600
        
        # Decay curve
        if hours_ago < 1:
            factor = 1.0
            reason = "1시간 이내 - 최대 가중치"
        elif hours_ago < 6:
            factor = 0.9
            reason = "1-6시간 - 높은 가중치"
        elif hours_ago < 24:
            factor = 0.7
            reason = "6-24시간 - 중간 가중치"
        elif hours_ago < 72:
            factor = 0.5
            reason = "1-3일 - 감소된 가중치"
        elif hours_ago < 168:
            factor = 0.3
            reason = "3-7일 - 낮은 가중치"
        else:
            factor = 0.1
            reason = "7일 이상 - 최소 가중치"
        
        details = {
            "hours_ago": round(hours_ago, 2),
            "factor": factor,
            "reason": reason,
            "formula": "decay_curve(hours_ago)"
        }
        
        return factor, details
    
    def calculate_threat_score(self, threat, include_details: bool = True) -> Tuple[float, dict]:
        """
        개별 위협의 점수 계산
        
        공식: score = severity × category_weight × source_credibility × temporal_factor × 2
        
        Returns:
            (score, calculation_details)
        """
        # Get weights and factors
        category_config = CATEGORY_WEIGHTS.get(threat.category, {"weight": 0.1, "name": "Unknown"})
        category_weight = category_config["weight"]
        
        source_credibility = SOURCE_CREDIBILITY.get(threat.source_type, 0.5)
        source_info = DATA_SOURCES.get(threat.source_type, {})
        
        temporal_factor, temporal_details = self.calculate_temporal_factor(threat.created_at)
        
        # Calculate score
        base_score = threat.severity * category_weight * source_credibility * temporal_factor
        final_score = min(100, max(0, base_score * 2))  # Scale to 0-100
        
        # Build calculation details
        details = {
            "input": {
                "severity": threat.severity,
                "category": threat.category,
                "source_type": threat.source_type,
                "created_at": threat.created_at.isoformat() if threat.created_at else None
            },
            "weights": {
                "category_weight": category_weight,
                "category_name": category_config["name"],
                "source_credibility": source_credibility,
                "source_name": source_info.get("name", "Unknown"),
                "source_description": source_info.get("description", ""),
                "temporal_factor": temporal_factor
            },
            "temporal_details": temporal_details,
            "calculation_steps": [
                f"1. 기본 점수: severity({threat.severity})",
                f"2. 카테고리 가중치 적용: {threat.severity} × {category_weight} = {threat.severity * category_weight:.2f}",
                f"3. 출처 신뢰도 적용: {threat.severity * category_weight:.2f} × {source_credibility} = {threat.severity * category_weight * source_credibility:.2f}",
                f"4. 시간 감쇠 적용: {threat.severity * category_weight * source_credibility:.2f} × {temporal_factor} = {base_score:.2f}",
                f"5. 스케일 조정 (×2): {base_score:.2f} × 2 = {base_score * 2:.2f}",
                f"6. 범위 제한 (0-100): {final_score:.2f}"
            ],
            "formula": "min(100, max(0, severity × category_weight × source_credibility × temporal_factor × 2))",
            "final_score": round(final_score, 2)
        }
        
        return final_score, details if include_details else {}
    
    def calculate_category_index(
        self, 
        category: str, 
        threats: List, 
        include_details: bool = True
    ) -> Tuple[float, dict]:
        """
        카테고리별 위협 지수 계산
        
        Returns:
            (index, calculation_details)
        """
        category_threats = [t for t in threats if t.category == category]
        category_config = CATEGORY_WEIGHTS.get(category, {"weight": 0.1, "name": "Unknown"})
        
        if not category_threats:
            # Base noise for empty categories
            base_index = random.uniform(15, 35)
            details = {
                "category": category,
                "category_name": category_config["name"],
                "threat_count": 0,
                "method": "baseline_noise",
                "reason": "해당 카테고리에 활성 위협 없음 - 기본 노이즈 적용",
                "final_index": round(base_index, 2)
            }
            return base_index, details
        
        # Calculate individual scores
        scores_with_details = [self.calculate_threat_score(t) for t in category_threats]
        scores = [s[0] for s in scores_with_details]
        
        base_score = sum(scores) / len(scores)
        
        # Add variation
        noise = random.uniform(-3, 3)
        final_index = min(100, max(0, base_score + noise))
        
        details = {
            "category": category,
            "category_name": category_config["name"],
            "threat_count": len(category_threats),
            "threat_ids": [t.id for t in category_threats],
            "individual_scores": [{"threat_id": t.id, "score": s[0], "title": t.title[:50]} 
                                 for t, s in zip(category_threats, scores_with_details)],
            "method": "average_with_noise",
            "calculation": {
                "sum_of_scores": round(sum(scores), 2),
                "average": round(base_score, 2),
                "noise_applied": round(noise, 2),
                "final_before_clamp": round(base_score + noise, 2)
            },
            "formula": "clamp(0, 100, average(individual_scores) + random_noise(-3, 3))",
            "final_index": round(final_index, 2)
        }
        
        return final_index, details
    
    def calculate_total_index(
        self, 
        category_indices: Dict[str, float],
        include_details: bool = True
    ) -> Tuple[float, dict]:
        """
        통합 위협 지수 계산
        
        공식: total = Σ(category_index × category_weight) × 1.5
        
        Returns:
            (total_index, calculation_details)
        """
        weighted_sum = 0
        weight_breakdown = []
        
        for cat, config in CATEGORY_WEIGHTS.items():
            cat_index = category_indices.get(cat, 0)
            weight = config["weight"]
            contribution = cat_index * weight
            weighted_sum += contribution
            
            weight_breakdown.append({
                "category": cat,
                "category_name": config["name"],
                "index": round(cat_index, 2),
                "weight": weight,
                "contribution": round(contribution, 2)
            })
        
        # Scale up
        scaled_total = weighted_sum * 1.5
        final_index = min(100, max(0, scaled_total))
        
        details = {
            "category_indices": category_indices,
            "weight_breakdown": weight_breakdown,
            "calculation": {
                "weighted_sum": round(weighted_sum, 2),
                "scale_factor": 1.5,
                "scaled_total": round(scaled_total, 2),
                "final_after_clamp": round(final_index, 2)
            },
            "formula": "clamp(0, 100, Σ(category_index × category_weight) × 1.5)",
            "final_index": round(final_index, 2)
        }
        
        return final_index, details
    
    def get_threat_level(self, index: float) -> Tuple[int, dict]:
        """
        위협 지수에서 레벨 결정
        
        Returns:
            (level, level_details)
        """
        for level, config in THREAT_LEVELS.items():
            if config["min"] <= index <= config["max"]:
                details = {
                    "index": round(index, 2),
                    "level": level,
                    "level_name": config["name"],
                    "level_range": f"{config['min']}-{config['max']}",
                    "level_color": config["color"],
                    "level_description": config["description"]
                }
                return level, details
        
        # Default to level 1
        return 1, {"index": round(index, 2), "level": 1, "level_name": "LOW"}
    
    def get_level_name(self, level: int) -> str:
        """레벨 이름 반환"""
        return LEVEL_NAMES.get(level, "UNKNOWN")
    
    def get_source_info(self, source_type: str) -> dict:
        """데이터 출처 정보 반환"""
        return DATA_SOURCES.get(source_type, {
            "name": "Unknown",
            "credibility": 0.5,
            "description": "알 수 없는 출처",
            "collection_method": "Unknown",
            "update_frequency": "Unknown"
        })
    
    def get_category_info(self, category: str) -> dict:
        """카테고리 정보 반환"""
        config = CATEGORY_WEIGHTS.get(category, {"weight": 0.1, "name": "Unknown", "description": ""})
        return {
            "category": category,
            "name": config["name"],
            "weight": config["weight"],
            "description": config.get("description", "")
        }

# Singleton instance
calculator = ThreatCalculator()
