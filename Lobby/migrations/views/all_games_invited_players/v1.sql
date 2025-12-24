CREATE OR REPLACE VIEW Lobby_all_games_invited_players AS (
  SELECT 'FCM' AS game,
         fcm_game_id AS id,
         user_id
  FROM FCM_fcm_game_invitedPlayers
  UNION ALL
  SELECT 'HC' AS game,
         hc_game_id AS id,
         user_id
  FROM HC_hc_game_invitedPlayers
  UNION ALL
  SELECT 'BUS' AS game,
         bus_game_id AS id,
         user_id
  FROM Bus_bus_game_invitedPlayers
  UNION ALL
  SELECT 'TGZ' AS game,
         tgz_game_id AS id,
         user_id
  FROM TGZ_tgz_game_invitedPlayers
  UNION ALL
  SELECT 'CNS' AS game,
          cns_game_id AS id,
          user_id
  FROM CNS_cns_game_invitedPlayers
  UNION ALL
  SELECT 'AQY' AS game,
          aqy_game_id AS id,
          user_id
  FROM AQY_aqy_game_invitedPlayers
  UNION ALL
  SELECT 'IND' AS game,
          ind_game_id AS id,
          user_id
  FROM IND_ind_game_invitedPlayers
  UNION ALL
  SELECT 'KFW' AS game,
          kfw_game_id AS id,
          user_id
  FROM KFW_kfw_game_invitedPlayers
  UNION ALL
  SELECT 'WEB' AS game,
          web_game_id AS id,
          user_id
  FROM WEB_web_game_invitedPlayers
);
