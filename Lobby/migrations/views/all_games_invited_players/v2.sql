CREATE OR REPLACE VIEW Lobby_all_games_invited_players AS (
  SELECT 'FCM' AS gameCode,
         fcm_game_id AS id,
         user_id
  FROM FCM_fcm_game_invitedPlayers
  UNION ALL
  SELECT 'HLC' AS gameCode,
         hc_game_id AS id,
         user_id
  FROM HC_hc_game_invitedPlayers
  UNION ALL
  SELECT 'BUS' AS gameCode,
         bus_game_id AS id,
         user_id
  FROM Bus_bus_game_invitedPlayers
  UNION ALL
  SELECT 'TGZ' AS gameCode,
         tgz_game_id AS id,
         user_id
  FROM TGZ_tgz_game_invitedPlayers
  UNION ALL
  SELECT 'CNS' AS gameCode,
          cns_game_id AS id,
          user_id
  FROM CNS_cns_game_invitedPlayers
  UNION ALL
  SELECT 'AQY' AS gameCode,
          aqy_game_id AS id,
          user_id
  FROM AQY_aqy_game_invitedPlayers
  UNION ALL
  SELECT 'IND' AS gameCode,
          ind_game_id AS id,
          user_id
  FROM IND_ind_game_invitedPlayers
  UNION ALL
  SELECT 'KFW' AS gameCode,
          kfw_game_id AS id,
          user_id
  FROM KFW_kfw_game_invitedPlayers
  UNION ALL
  SELECT 'WEB' AS gameCode,
          web_game_id AS id,
          user_id
  FROM WEB_web_game_invitedPlayers
);
