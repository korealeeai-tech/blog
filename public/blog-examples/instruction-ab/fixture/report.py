"""일일 처리 결과 리포트를 출력한다."""
import datetime

ITEMS = [("주문", 120, 3), ("환불", 8, 1), ("문의", 45, 0)]


def run():
    print("DEBUG start", datetime.datetime.now())
    total = 0
    for name, count, failed in ITEMS:
        print("processing " + name)
        print(name, count, failed)
        print("ok=" + str(count - failed) + " fail=" + str(failed))
        total += count
    print("DEBUG total", total)
    print("done!!!")
    print("")
    print("")


if __name__ == "__main__":
    run()
