"""RNB production setup phase is numbered 17 but must sort between the production turn order conflict and production."""

import os
import sys
import unittest
from types import SimpleNamespace

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "OnlineBoardGamers.settings")
import django

django.setup()

from Lobby.presenters import RNBpresenter, rnbPhaseOrder
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


class _FakePlayers:
    def __init__(self, gp):
        self.gp = gp

    def filter(self, **kwargs):
        return self

    def first(self):
        return self.gp


class RNBCurrentMoveDataTests(unittest.TestCase):
    def _presenter(self, move_data):
        presenter = RNBpresenter.__new__(RNBpresenter)
        presenter.seatPosition = lambda name: 0
        presenter.gameObj = SimpleNamespace(
            turn=5,
            phase=rfRNB.PHASE_PRODUCTION_SETUP_TO,
            players=_FakePlayers(SimpleNamespace(moveDataJSON=move_data)),
        )
        return presenter

    def test_exact_setup_phase_wins_over_stale_wonder_move(self):
        moves = [
            {"turn": 5, "phase": rfRNB.PHASE_WONDER_TO},
            {"turn": 5, "phase": rfRNB.PHASE_PRODUCTION_SETUP_TO},
        ]
        self.assertEqual(self._presenter(moves).getCurrentMoveDataForPlayer("x")["phase"], rfRNB.PHASE_PRODUCTION_SETUP_TO)

    def test_falls_back_to_recent_phase_when_no_exact_move(self):
        moves = [{"turn": 5, "phase": rfRNB.PHASE_PRODUCTION_SETUP_TO - 1}]
        self.assertEqual(self._presenter(moves).getCurrentMoveDataForPlayer("x")["phase"], rfRNB.PHASE_PRODUCTION_SETUP_TO - 1)


if __name__ == "__main__":
    unittest.main()
