CREATE OR REPLACE VIEW Lobby_all_games_all_players AS (
  SELECT 'FCM' AS gameCode,
         fcm_game_id AS id,
         user_id,
         EXISTS(
           SELECT 1 
           FROM FCM_fcm_game_playersWithChatNotification 
           WHERE FCM_fcm_game_playersWithChatNotification.fcm_game_id = FCM_fcm_game_allPlayers.fcm_game_id 
           AND FCM_fcm_game_playersWithChatNotification.user_id = FCM_fcm_game_allPlayers.user_id
         ) AS hasChatNotification
  FROM FCM_fcm_game_allPlayers
  UNION ALL
  SELECT 'HC' AS gameCode,
         hc_game_id AS id,
         user_id,
         EXISTS(
           SELECT 1 
           FROM HC_hc_game_playersWithChatNotification 
           WHERE HC_hc_game_playersWithChatNotification.hc_game_id = HC_hc_game_allPlayers.hc_game_id 
           AND HC_hc_game_playersWithChatNotification.user_id = HC_hc_game_allPlayers.user_id
         ) AS hasChatNotification
  FROM HC_hc_game_allPlayers
  UNION ALL
  SELECT 'BUS' AS gameCode,
         bus_game_id AS id,
         user_id,
         EXISTS(
           SELECT 1 
           FROM Bus_bus_game_playersWithChatNotification 
           WHERE Bus_bus_game_playersWithChatNotification.bus_game_id = Bus_bus_game_allPlayers.bus_game_id 
           AND Bus_bus_game_playersWithChatNotification.user_id = Bus_bus_game_allPlayers.user_id
         ) AS hasChatNotification
  FROM Bus_bus_game_allPlayers
  UNION ALL
  SELECT 'TGZ' AS gameCode,
         tgz_game_id AS id,
         user_id,
         EXISTS(
           SELECT 1 
           FROM TGZ_tgz_game_playersWithChatNotification 
           WHERE TGZ_tgz_game_playersWithChatNotification.tgz_game_id = TGZ_tgz_game_allPlayers.tgz_game_id 
           AND TGZ_tgz_game_playersWithChatNotification.user_id = TGZ_tgz_game_allPlayers.user_id
         ) AS hasChatNotification
  FROM TGZ_tgz_game_allPlayers
  UNION ALL
  SELECT 'CNS' AS gameCode,
          cns_game_id AS id,
          user_id,
          EXISTS(
            SELECT 1 
            FROM CNS_cns_game_playersWithChatNotification 
            WHERE CNS_cns_game_playersWithChatNotification.cns_game_id = CNS_cns_game_allPlayers.cns_game_id 
            AND CNS_cns_game_playersWithChatNotification.user_id = CNS_cns_game_allPlayers.user_id
          ) AS hasChatNotification
  FROM CNS_cns_game_allPlayers
  UNION ALL
  SELECT 'AQY' AS gameCode,
          aqy_game_id AS id,
          user_id,
          EXISTS(
            SELECT 1 
            FROM AQY_aqy_game_playersWithChatNotification 
            WHERE AQY_aqy_game_playersWithChatNotification.aqy_game_id = AQY_aqy_game_allPlayers.aqy_game_id 
            AND AQY_aqy_game_playersWithChatNotification.user_id = AQY_aqy_game_allPlayers.user_id
          ) AS hasChatNotification
  FROM AQY_aqy_game_allPlayers
  UNION ALL
  SELECT 'IND' AS gameCode,
          ind_game_id AS id,
          user_id,
          EXISTS(
            SELECT 1 
            FROM IND_ind_game_playersWithChatNotification 
            WHERE IND_ind_game_playersWithChatNotification.ind_game_id = IND_ind_game_allPlayers.ind_game_id 
            AND IND_ind_game_playersWithChatNotification.user_id = IND_ind_game_allPlayers.user_id
          ) AS hasChatNotification
  FROM IND_ind_game_allPlayers
  UNION ALL
  SELECT 'KFW' AS gameCode,
          kfw_game_id AS id,
          user_id,
          EXISTS(
            SELECT 1 
            FROM KFW_kfw_game_playersWithChatNotification 
            WHERE KFW_kfw_game_playersWithChatNotification.kfw_game_id = KFW_kfw_game_allPlayers.kfw_game_id 
            AND KFW_kfw_game_playersWithChatNotification.user_id = KFW_kfw_game_allPlayers.user_id
          ) AS hasChatNotification
  FROM KFW_kfw_game_allPlayers
  UNION ALL
  SELECT 'WEB' AS gameCode,
          web_game_id AS id,
          user_id,
          EXISTS(
            SELECT 1 
            FROM WEB_web_game_playersWithChatNotification 
            WHERE WEB_web_game_playersWithChatNotification.web_game_id = WEB_web_game_allPlayers.web_game_id 
            AND WEB_web_game_playersWithChatNotification.user_id = WEB_web_game_allPlayers.user_id
          ) AS hasChatNotification
  FROM WEB_web_game_allPlayers
);
