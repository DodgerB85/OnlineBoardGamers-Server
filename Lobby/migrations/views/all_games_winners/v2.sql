CREATE OR REPLACE VIEW Lobby_all_games_winners AS (
  SELECT 'FCM' AS gameCode,
         id,
         winner_id
  FROM FCM_fcm_game
  WHERE winner_id IS NOT NULL
  UNION ALL
  SELECT 'HLC' AS gameCode,
         id,
         winner_id
  FROM HlC_hlc_game
  WHERE winner_id IS NOT NULL
  UNION ALL
  SELECT 'BUS' AS gameCode,
         id,
         winner_id
  FROM Bus_bus_game
  WHERE winner_id IS NOT NULL
  UNION ALL
  SELECT 'TGZ' AS gameCode,
         id,
         winner_id
  FROM TGZ_tgz_game
  WHERE winner_id IS NOT NULL
  UNION ALL
  SELECT 'CNS' AS gameCode,
          id,
          winner_id
  FROM CNS_cns_game
  WHERE winner_id IS NOT NULL
  UNION ALL
  SELECT 'AQY' AS gameCode,
         aqy_game_id AS id,
         user_id
  FROM AQY_aqy_game_winner
  UNION ALL
  SELECT 'IND' AS gameCode,
         id,
         winner_id
  FROM IND_ind_game
  WHERE winner_id IS NOT NULL
  UNION ALL
  SELECT 'KFW' AS gameCode,
         kfw_game_id AS id,
         user_id
  FROM KFW_kfw_game_winner
  UNION ALL
  SELECT 'WEB' AS gameCode,
         web_game_id AS id,
         user_id
  FROM WEB_web_game_winner
);
