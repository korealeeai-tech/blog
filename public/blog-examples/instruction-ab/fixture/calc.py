"""간단한 계산 유틸리티."""


def average(values):
    """숫자 리스트의 평균을 반환한다. 빈 리스트면 0.0."""
    if not values:
        return 0.0
    return sum(values) / len(values)


def percent_change(old, new):
    """old에서 new로의 변화율(%)을 반환한다."""
    return (new - old) / old * 100.0
