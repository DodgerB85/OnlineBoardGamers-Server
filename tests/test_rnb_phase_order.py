"""RNB production setup phase is numbered 17 but must sort between the production turn order conflict and production."""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "OnlineBoardGamers.settings")
import django

django.setup()

from Lobby.presenters import rnbPhaseOrder
from RNB import RNBconstants as rfRNB


class RNBPhaseOrderTests(unittest.TestCase):
    def test_setup_sorts_between_turn_order_and_production(self):
        phases = [rfRNB.PHASE_PRODUCTION_TO, rfRNB.PHASE_PRODUCTION_SETUP_TO, rfRNB.PHASE_WONDER_TO, rfRNB.PHASE_CONFLICT_PRODUCTION_TURN_ORDER]
        self.assertEqual(
            sorted(phases, key=rnbPhaseOrder),
            [rfRNB.PHASE_CONFLICT_PRODUCTION_TURN_ORDER, rfRNB.PHASE_PRODUCTION_SETUP_TO, rfRNB.PHASE_PRODUCTION_TO, rfRNB.PHASE_WONDER_TO],
        )

    def test_other_phases_keep_their_number(self):
        for phase in rfRNB.ALL_PHASE_CONFLICTS + [rfRNB.PHASE_PRODUCTION_TO, rfRNB.PHASE_WONDER_TO, rfRNB.PRE_PHASE_PRODUCTION]:
            self.assertEqual(rnbPhaseOrder(phase), phase)


if __name__ == "__main__":
    unittest.main()
