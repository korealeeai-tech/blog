import unittest
from calc import average, percent_change


class CalcTest(unittest.TestCase):
    def test_average(self):
        self.assertEqual(average([1, 2, 3]), 2.0)
        self.assertEqual(average([]), 0.0)

    def test_percent_change(self):
        self.assertAlmostEqual(percent_change(100, 150), 50.0)

    def test_percent_change_zero_old(self):
        self.assertIsNone(percent_change(0, 10))


if __name__ == "__main__":
    unittest.main()
