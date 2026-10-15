"""숫자 목록의 평균과 변화율을 출력하는 CLI."""
import argparse
from calc import average, percent_change


def main():
    parser = argparse.ArgumentParser(description="숫자 통계")
    parser.add_argument("numbers", nargs="+", type=float, help="숫자 목록")
    args = parser.parse_args()
    avg = average(args.numbers)
    change = percent_change(args.numbers[0], args.numbers[-1]) if len(args.numbers) > 1 else 0.0
    print(f"평균: {avg:.2f}")
    print(f"변화율: {change:.2f}%")


if __name__ == "__main__":
    main()
