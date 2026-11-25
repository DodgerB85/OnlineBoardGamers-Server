import json
from unittest.mock import patch
from django.test import SimpleTestCase, TestCase
from Lobby.models import Game, GamePlayer, User
from django.test import RequestFactory
from django.contrib.messages.storage.fallback import FallbackStorage
from types import SimpleNamespace
from FCM.common import create_fcm_game, validateFCMOptionDependencies
from FCM import FCMconstants as rf
from FCM.common import buildFCMstartingOptions, STATS_EXCLUDED_OPTIONS

class BalanceOptionTests(SimpleTestCase):
    def test_conflicting_fan_pool_post_returns_page_error_before_database_access(self):
        post = {'enableAdvancedOptions':'','randomModules':'','draftModules':'',
                'random_MS':'202','draft_MS':'301','includeFanExpansion':'',
                'gameName':'Test','gameDescription':'','playerNumber':'2','mapData':'','pace':'30'}
        request = RequestFactory().post('/create-fcm/', post)
        request.user = SimpleNamespace(is_authenticated=True, username='isolated')
        request.session = {}; request._messages = FallbackStorage(request)
        try:
            response = create_fcm_game(request)
        except ValueError:
            self.fail('Conflicting Balance-capable random pool must return a page error, not HTTP 500')
        from django.urls import reverse
        self.assertEqual(response.url, reverse('createFCMpage'))
        self.assertIn('Requires New Milestones', str(list(request._messages)[0]))

    def test_conflicting_include_post_returns_page_error_before_database_access(self):
        post = {'enableAdvancedOptions':'','randomModules':'','draftModules':'',
                'random_MS':'202','draft_MS':'301','includeFanExpansion':'','include_54':'',
                'gameName':'Test','gameDescription':'','playerNumber':'2','mapData':'','pace':'30'}
        request = RequestFactory().post('/create-fcm/', post)
        request.user = SimpleNamespace(is_authenticated=True, username='isolated')
        request.session = {}; request._messages = FallbackStorage(request)
        try:
            response = create_fcm_game(request)
        except ValueError:
            self.fail('Crafted include_54 dependency error must be a page error, not HTTP 500')
        from django.urls import reverse
        self.assertEqual(response.url, reverse('createFCMpage'))
        self.assertIn('Requires New Milestones', str(list(request._messages)[0]))

    def test_conflicting_active_selectors_reject_balance_intent_in_crafted_post(self):
        base = {'enableAdvancedOptions':'','randomModules':'','draftModules':'','includeFanExpansion':'','newMilestones':'21'}
        for intent in [{'milestoneNightBalance':'54'}, {'include_54':''}, {}]:
            for random_ms, draft_ms in [('202','301'), ('201','302'), ('201','301'), ('202',None)]:
                with self.subTest(intent=intent, random_ms=random_ms, draft_ms=draft_ms):
                    post = {**base, **intent, 'random_MS':random_ms}
                    if draft_ms is not None:
                        post['draft_MS'] = draft_ms
                    with self.assertRaisesMessage(ValueError, 'Requires New Milestones'):
                        buildFCMstartingOptions(post)
        # A single invalid include is inert, not a request to upgrade old milestones.
        options = buildFCMstartingOptions({'enableAdvancedOptions':'','randomModules':'','random_MS':'201','include_54':''})
        self.assertNotIn(21, options)

    def test_random_direct_checkbox_is_not_a_selected_or_mandatory_module(self):
        post = {'enableAdvancedOptions':'','randomModules':'','random_MS':'202',
                'includeFanExpansion':'','milestoneNightBalance':'54'}
        options = buildFCMstartingOptions(post)
        self.assertNotIn(54, options)
        self.assertNotIn(1154, options)
        self.assertIn(1154, buildFCMstartingOptions({**post, 'include_54':''}))

    def test_global_27th_choice_preserves_balance_include_and_exclude(self):
        ids = [8,9,10,11,12,13,14,15,16,17,18,19,20,22,23,42,43,44,45,46,47,48,49,50,51,53,54]
        post = {'enableAdvancedOptions':'', 'randomModules':'', 'random_MS':'202', 'includeFanExpansion':''}
        post.update({f'{choice}_{mod}':'' for choice in ['include','exclude'] for mod in ids})
        post.update({'exclude_99':'', 'exclude_008':'', 'include_99':''})
        options = buildFCMstartingOptions(post)
        self.assertEqual([x for x in options if 1000 <= x < 1100], [1000+m for m in ids])
        self.assertEqual([x for x in options if 1100 <= x < 1200], [1100+m for m in ids])

    def test_room_displays_independent_balance_after_new_milestones(self):
        from Lobby.sharedFunctions.sharedRefs import SR_getFCMstartingOptionsHTML
        html = SR_getFCMstartingOptionsHTML([54,21,16])
        self.assertIn('Player Balance Module', html)
        self.assertLess(html.index('New Milestones'), html.index('Player Balance Module'))
        self.assertIn('Night Shift', html)
        self.assertNotIn('Player Balance Module', SR_getFCMstartingOptionsHTML([21,16]))

    def test_invalid_creation_returns_page_error_before_any_database_access(self):
        request = RequestFactory().post('/create-fcm/', {'milestoneNightBalance':'54','gameName':'Test','gameDescription':'','playerNumber':'2','mapData':'','pace':'5'})
        request.user = SimpleNamespace(is_authenticated=True, username='isolated')
        request.session = {}
        request._messages = FallbackStorage(request)
        response = create_fcm_game(request)
        self.assertEqual(response.status_code, 302)
        from django.urls import reverse
        self.assertEqual(response.url, reverse('createFCMpage'))
        self.assertIn('Requires New Milestones', str(list(request._messages)[0]))

    def test_tournament_copy_validates_flags_before_any_database_access(self):
        request = RequestFactory().get('/create-fcm/')
        request.user = SimpleNamespace(is_authenticated=True)
        tournament = SimpleNamespace(tournamentCategory='Main', maxGamePlayers=2, tournamentName='isolated', startingOptions='[54,20]')
        with self.assertRaisesMessage(ValueError, 'Requires New Milestones'):
            create_fcm_game(request, tournament, 'R1')
        for options in [[54], [54,20], [54,21,1], [54,21,2]]:
            with self.assertRaisesMessage(ValueError, 'Requires New Milestones'):
                validateFCMOptionDependencies(options)
        validateFCMOptionDependencies([54,21])
        validateFCMOptionDependencies([20])

    def test_advanced_milestones_use_mode_selector_not_hidden_manual_checkbox(self):
        for mode, selector, old, new in [('randomModules','random_MS','201','202'), ('draftModules','draft_MS','301','302')]:
            base = {'enableAdvancedOptions':'', mode:'', 'milestoneNightBalance':'54'}
            with self.subTest(mode=mode):
                with self.assertRaisesMessage(ValueError, 'Requires New Milestones'):
                    buildFCMstartingOptions({**base, selector:old, 'newMilestones':'21'})
                selected = buildFCMstartingOptions({**base, selector:new})
                self.assertEqual(54 in selected, mode == 'draftModules')
                with self.assertRaisesMessage(ValueError, 'Requires New Milestones'):
                    buildFCMstartingOptions({**base, 'newMilestones':'21'})
        # Preserve legacy requests when the new mod is absent.
        self.assertIn(21, buildFCMstartingOptions({'enableAdvancedOptions':'','randomModules':'','random_MS':'201','newMilestones':'21'}))

    def test_manual_dependency(self):
        self.assertEqual(rf.SO_MILESTONE_NIGHT_BALANCE, 54)
        self.assertEqual(buildFCMstartingOptions({}), [])
        self.assertEqual(buildFCMstartingOptions({'ketchupMilestone':'20'}), [20])
        self.assertIn(54, buildFCMstartingOptions({'newMilestones':'21', 'milestoneNightBalance':'54'}))
        self.assertNotIn(16, buildFCMstartingOptions({'newMilestones':'21', 'milestoneNightBalance':'54'}))
        self.assertIn(54, STATS_EXCLUDED_OPTIONS)
        for rest in [{}, {'ketchupMilestone':'20'}, {'newMilestones':'21','short':'1'}, {'newMilestones':'21','noMilestones':'2'}]:
            with self.subTest(rest=rest), self.assertRaisesMessage(ValueError, 'Requires New Milestones'):
                buildFCMstartingOptions({'milestoneNightBalance':'54', **rest})


class BalanceStartTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='task2a')
        self.request = RequestFactory().post('/')
        self.request.user = self.user
        self.notify = patch('Lobby.presenters.FCMpresenter._sendStartGameNotification')
        self.notify_mock = self.notify.start()
        self.addCleanup(self.notify.stop)

    def start(self, options, roll_fn=None):
        game = Game.objects.create(gameCode='FCM', creator=self.user, host=self.user,
            gameStatus='AVAILABLE', maxPlayers=2, startingOptions=json.dumps(options))
        GamePlayer.objects.create(game=game, player=self.user, seat_order=0)
        with patch('Lobby.presenters.random.randrange', side_effect=roll_fn or (lambda lo, hi, step=1: lo)) as roll:
            game.presenter().startGame(self.request)
        game.refresh_from_db()
        return game, json.loads(game.startingOptions), roll

    def test_pool_matrix_preserves_26_effective_and_27_union(self):
        from itertools import product
        ids = {8,9,10,11,12,13,14,15,16,17,18,19,20,22,23,42,43,44,45,46,47,48,49,50,51,53,54}
        union = set()
        for new, fan, chinese, unusable in product([False,True], [False,True], [False,True], [None,1,2]):
            options = [200,21099,21199] + ([21] if new else []) + ([204] if fan else []) + ([203] if chinese else [])
            options += ([unusable] if unusable else []) + [1100+m for m in ids]
            with self.subTest(new=new,fan=fan,chinese=chinese,unusable=unusable):
                _, final, roll = self.start(options)
                eligible = 14 + (not new) + 4*chinese + 7*fan + (new and fan and not unusable)
                modules = [x for x in final if x in ids]
                self.assertEqual(len(modules), eligible)
                self.assertEqual(len(modules), len(set(modules)))
                self.assertEqual(54 in final, new and fan and not unusable)
                self.assertEqual(8 in final, not new)
                self.assertEqual(roll.call_args_list[0].args, (eligible,eligible+1,1))
                if not unusable:
                    union.update(modules)
        self.assertEqual(len(union), 27)

    def test_all_excluded_including_27th_id_can_legally_resolve_zero(self):
        ids = [8,9,10,11,12,13,14,15,16,17,18,19,20,22,23,42,43,44,45,46,47,48,49,50,51,53,54]
        for new in [False,True]:
            with self.subTest(new=new):
                post = {'enableAdvancedOptions':'','randomModules':'','random_MS':'202' if new else '201',
                    'includeChineseExpansion':'','includeFanExpansion':'','minModules':'26','maxModules':'26'}
                post.update({f'{choice}_{m}':'' for choice in ['include','exclude'] for m in ids})
                game, final, roll = self.start(buildFCMstartingOptions(post)+[54,16])
                self.assertFalse(set(final)&set(ids))
                self.assertEqual(roll.call_args_list[0].args, (0,1,1))
                self.assertFalse(game.statsExcludedGame)

    def test_random_roll_can_select_balance_without_mandatory_and_without_night_shift(self):
        game, final, _ = self.start([200,21,204,21001,21101], lambda lo,hi,step=1: hi-1 if lo==0 else lo)
        self.assertIn(54, final); self.assertNotIn(16, final)
        self.assertTrue(game.statsExcludedGame)

    def test_tournament_residual_balance_stats_follow_actual_selection(self):
        from Lobby.models import Tournament
        admin = User.objects.create_user(username='admin')
        for extra, expected in [([54,1054], False), ([54], False), ([54,1154], True), ([54,1054,46], True)]:
            with self.subTest(extra=extra):
                options = [200,21,204,*extra,21001,21101]
                t = Tournament.objects.create(tournamentCategory='Main', tournamentName='stats regression',
                    maxTournamentPlayers=2, maxGamePlayers=2, creator=admin, startingOptions=json.dumps(options))
                with patch('Lobby.presenters.random.randrange', side_effect=lambda lo,hi,step=1:lo):
                    game_id = create_fcm_game(self.request, t, 'R1', ['admin','task2a'])
                game = Game.objects.get(id=game_id)
                final = json.loads(game.startingOptions)
                self.assertEqual(game.gameStatus, 'ACTIVE')
                self.assertEqual(54 in final, 1154 in extra)
                self.assertEqual(game.statsExcludedGame, expected, 'excluded/unselected Balance leftover must not exclude stats')
                if extra == [54,1054]:
                    self.assertEqual(final, [200,21,21001,21101,20])

    def test_normal_creation_direct_balance_and_learning_stats_reasons_survive(self):
        for extra, expected in [({'milestoneNightBalance':'54'}, True),
                                ({'learningGame':'110','enableAdvancedOptions':'','randomModules':'',
                                  'random_MS':'202','includeFanExpansion':'','exclude_54':'',
                                  'minModules':'1','maxModules':'1'}, True)]:
            with self.subTest(extra=extra):
                request = RequestFactory().post('/', {'gameName':'stats regression', 'gameDescription':'',
                    'playerNumber':'2', 'mapData':'', 'pace':'30', 'newMilestones':'21', **extra})
                request.user = self.user; request.session = {}; request._messages = FallbackStorage(request)
                create_fcm_game(request)
                game = Game.objects.latest('id')
                self.assertEqual(game.statsExcludedGame, expected)
                with patch('Lobby.presenters.random.randrange', side_effect=lambda lo,hi,step=1:lo):
                    game.presenter().startGame(request)
                game.refresh_from_db()
                self.assertEqual(game.statsExcludedGame, expected)
                self.assertEqual(54 in json.loads(game.startingOptions), 'milestoneNightBalance' in extra)

    def test_explicit_stats_exclusion_survives_random_balance_cleanup(self):
        game = Game.objects.create(gameCode='FCM', creator=self.user, host=self.user,
            gameStatus='AVAILABLE', maxPlayers=2, statsExcludedGame=True,
            startingOptions=json.dumps([200,21,204,54,1054,21001,21101]))
        GamePlayer.objects.create(game=game, player=self.user, seat_order=0)
        with patch('Lobby.presenters.random.randrange', side_effect=lambda lo,hi,step=1:lo):
            game.presenter().startGame(self.request)
        game.refresh_from_db()
        self.assertNotIn(54, json.loads(game.startingOptions))
        self.assertTrue(game.statsExcludedGame)

    def test_real_tournament_copies_resolve_before_gameplay(self):
        from Lobby.models import Tournament
        admin = User.objects.create_user(username='admin')
        options = [200,21,204,21001,21101,1154,1016]
        for category in ['Main','Mini']:
            with self.subTest(category=category):
                t = Tournament.objects.create(tournamentCategory=category, tournamentName='task2a',
                    maxTournamentPlayers=2, maxGamePlayers=2, creator=admin, startingOptions=json.dumps(options))
                with patch('Lobby.presenters.random.randrange', side_effect=lambda lo,hi,step=1:lo):
                    game_id = create_fcm_game(self.request, t, 'R1', ['admin','task2a'])
                game = Game.objects.get(id=game_id)
                final = json.loads(game.startingOptions)
                self.assertEqual(game.gameStatus,'ACTIVE');self.assertIn(54,final);self.assertNotIn(16,final)
                self.assertFalse(any(1000<=x<1200 for x in final))
                self.assertTrue(game.statsExcludedGame)
                t.refresh_from_db();self.assertEqual(json.loads(t.startingOptions),options)
                t.startingOptions='[54,20]';t.save()
                before=Game.objects.count()
                with self.assertRaisesMessage(ValueError,'Requires New Milestones'):
                    create_fcm_game(self.request,t,'R2',['admin','task2a'])
                self.assertEqual(Game.objects.count(),before)

    def test_real_browser_formdata_and_backend_eligible_pools_agree(self):
        from pathlib import Path
        import os
        artifact = os.environ.get('TASK2A_ARTIFACTS')
        evidence = Path(artifact)/'task2a-browser-results.json' if artifact else None
        if not evidence or not evidence.exists():
            self.skipTest('Run isolated Task2A Chromium harness to supply real FormData')
        cases = json.loads(evidence.read_text(encoding='utf-8'))['cases']
        ids = {8,9,10,11,12,13,14,15,16,17,18,19,20,22,23,42,43,44,45,46,47,48,49,50,51,53,54}
        report = []
        for case in cases:
            with self.subTest(case=case['name']):
                result=case['result']; post=result.get('post',result)
                _, final, _ = self.start(buildFCMstartingOptions(post))
                self.assertFalse(any(1000<=x<1200 for x in final))
                validateFCMOptionDependencies(final)
                if 'include_54' in post or 'milestoneNightBalance' in post:
                    self.assertIn(54,final)
                if 'exclude_54' in post:
                    self.assertNotIn(54,final)
                if 'exclude_16' in post:
                    self.assertNotIn(16,final)
                # The pool is meaningful only while random mode is submitted;
                # mode-exit browser cases still replay their real nonrandom POST.
                if 'pool' in result and 'randomModules' in post:
                    p={k:v for k,v in post.items() if not k.startswith('exclude_')}
                    p.update(minModules='99',maxModules='99')
                    _, resolved, _ = self.start(buildFCMstartingOptions(p))
                    self.assertEqual(set(resolved)&ids,set(result['pool']))
                report.append({'case':case['name'],'post':post,'resolved':final})
        (Path(artifact)/'task2a-browser-backend-agreement.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')

    def test_random_old_selector_ignores_hidden_manual_new_milestones(self):
        post = {'enableAdvancedOptions':'','randomModules':'','random_MS':'201',
                'newMilestones':'21','includeFanExpansion':'','include_54':'','minModules':'26','maxModules':'26'}
        _, final, _ = self.start(buildFCMstartingOptions(post))
        self.assertNotIn(54, final)
        self.assertNotIn(21, final)
        self.assertIn(8, final)

    def test_random_choices_and_fan_count_render_in_six_languages(self):
        from pathlib import Path
        from django.urls import reverse
        from django.utils.translation import override
        import os
        root = Path(__file__).resolve().parents[1]
        data = json.loads((root/'tools/task2a_catalog_translations.json').read_text(encoding='utf-8'))
        User.objects.create_user(username='SHADOW')
        self.client.force_login(self.user)
        for lang, texts in data.items():
            with self.subTest(lang=lang), override(lang):
                response = self.client.get(reverse('createFCMpage'), HTTP_ACCEPT_LANGUAGE=lang)
                self.assertEqual(response.status_code, 200)
                page = response.content.decode()
                import html
                for text in texts:
                    self.assertTrue(text in html.unescape(page), f'{lang}: missing translated random label {text}')
                for choice in ['include','exclude']:
                    self.assertEqual(page.count(f'id="{choice}_54"'), 1)
                if os.environ.get('TASK2A_ARTIFACTS'):
                    (Path(os.environ['TASK2A_ARTIFACTS'])/f'task2a-create-{lang}.html').write_text(page, encoding='utf-8')

    def test_random_direct_core_leftovers_do_not_bypass_total_without_mandatory(self):
        _, final, _ = self.start([200,21,21001,21101,10,10])
        self.assertEqual([x for x in final if x in [9,10,11,12,13,14,15,16,17,18,19,20,22,23]], [20])

    def test_exclusion_wins_over_direct_night_shift_without_include_markers(self):
        game, final, _ = self.start([200,21,204,21001,21101,16,1016,1154])
        self.assertIn(54, final)
        self.assertNotIn(16, final)
        game, final, _ = self.start([200,21,21001,21101,16,1016])
        self.assertNotIn(16, final)

    def test_setup_markers_never_leak_and_stats_follow_resolved_balance(self):
        game, final, _ = self.start([21,54,1110,1053])
        self.assertEqual(final, [21,54])
        self.assertTrue(game.statsExcludedGame)
        game, final, _ = self.start([200,21,204,21001,21101,1054])
        self.assertNotIn(54, final)
        self.assertFalse(game.statsExcludedGame)

    def test_invalid_resolved_balance_rejects_before_seed_status_or_seats_change(self):
        for options in [[54], [54,20], [54,21,1], [54,21,2], [300,54], [205,54], [54,20,1154], [200,21,204,1154,1021,21001,21101]]:
            with self.subTest(options=options):
                game = Game.objects.create(gameCode='FCM', creator=self.user, host=self.user,
                    gameStatus='AVAILABLE', playerOrderSeed=17, startingOptions=json.dumps(options))
                gp = GamePlayer.objects.create(game=game, player=self.user, seat_order=0)
                before = (game.playerOrderSeed, game.gameStatus, game.startingOptions)
                with self.assertRaisesMessage(ValueError, 'Requires New Milestones'):
                    game.presenter().startGame(self.request)
                self.assertEqual((game.playerOrderSeed, game.gameStatus, game.startingOptions), before)
                self.assertFalse(game.statsExcludedGame)
                game.refresh_from_db(); gp.refresh_from_db()
                self.assertEqual((game.playerOrderSeed, game.gameStatus, game.startingOptions), before)
                self.assertFalse(gp.is_current)
        self.notify_mock.assert_not_called()

    def test_random_balance_cannot_bypass_eligibility_or_exclusions_as_direct_flag(self):
        for extra in [[21,204,1054], [21], [204], [20,204], [21,204,1], [21,204,2]]:
            with self.subTest(extra=extra):
                game, final, roll = self.start([200,21001,21101,54,1154,*extra])
                self.assertNotIn(54, final)
                self.assertEqual(21 in final, 21 in extra)
                self.assertFalse(any(1000 <= x < 1200 for x in final))
        # A direct flag is not another mandatory marker even when eligible.
        game, final, roll = self.start([200,21,204,21001,21101,54])
        self.assertNotIn(54, final)
        self.assertFalse(game.statsExcludedGame)

    def test_random_new_fan_mandatory_balance_counts_in_total_without_night_shift(self):
        game, final, roll = self.start([200,21,204,21001,21101,1154,1154])
        self.assertIn(54, final)
        self.assertEqual(final.count(54), 1)
        self.assertNotIn(16, final)
        self.assertTrue(game.statsExcludedGame)
        self.assertEqual(roll.call_args_list[0].args, (1,2,1))
        self.assertFalse(any(1000 <= x < 1200 for x in final))

