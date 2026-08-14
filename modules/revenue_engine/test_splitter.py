import unittest

from modules.revenue_engine.splitter import SplitError, split_amount, to_cents


class SplitterTests(unittest.TestCase):
    def test_cents_rounding(self):
        self.assertEqual(to_cents("10.005"), 1000)
        self.assertEqual(to_cents(10.5), 1050)

    def test_balanced_split(self):
        result = split_amount(
            "100.00",
            [
                {"name": "A", "share_percent": 70},
                {"name": "B", "share_percent": 20},
                {"name": "C", "share_percent": 10},
            ],
        )
        self.assertTrue(result["balanced"])
        self.assertEqual(result["amount_cents"], 10000)
        self.assertEqual(sum(item["amount_cents"] for item in result["allocations"]), 10000)
        self.assertEqual(result["allocations"][0]["amount_cents"], 7000)

    def test_remainder_kurus(self):
        result = split_amount(
            "1.00",
            [
                {"name": "A", "share_bps": 3333},
                {"name": "B", "share_bps": 3333},
                {"name": "C", "share_bps": 3334},
            ],
        )
        cents = [item["amount_cents"] for item in result["allocations"]]
        self.assertEqual(sum(cents), 100)
        self.assertTrue(result["balanced"])

    def test_rejects_bad_total(self):
        with self.assertRaises(SplitError):
            split_amount(50, [{"name": "A", "share_percent": 40}])


if __name__ == "__main__":
    unittest.main()
