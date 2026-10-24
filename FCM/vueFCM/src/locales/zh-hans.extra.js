// zh-hans messages added after the main translation pass. Merged over zh-hans.js in index.js.
export default {
	"actionArea": {
		"turnNudge": {
		"streak": "🔥 连续 {days} 天 · 最佳：{best}。{goal}",
		"goalMet": "今天的目标已达成。",
		"goalRemaining": "任意玩家在 UTC 午夜前完成一回合即可达成今天的目标。",
		"button": "提醒 {name}",
		"tooltipSend": "发送回合提醒",
		"tooltipDisabled": "提醒已关闭，或过去 24 小时内已发送过提醒",
		"limit": "每位玩家每局每 24 小时只能收到一次提醒。",
		"sending": "正在发送…",
		"failed": "无法发送提醒，请重试。",
		"loadFailed": "无法加载回合提醒。"
		},
		"savingGame": "正在保存游戏.... 请稍候....",
		"loggedOutPrompt": "请{register}或{login}以开始游戏",
		"register": "注册",
		"login": "登录",
		"resignUnbalance": "投降会破坏剩余玩家的游戏平衡",
		"resignCarryOn": "如果可能的话，请继续游戏",
		"resignStillCompete": "即使你认为自己无法获胜，你仍然可以争取最长道路／最多城墙等目标",
		"carryOnPlaying": "继续游戏",
		"confirmResignation": "确认投降",
		"playerUsedAllKickoutTime": "玩家 {name} 已用完所有标准踢出时间。",
		"remainingFlexTime": "剩余弹性时间：",
		"forMoreInfoSeeHelp": "更多信息请参阅{help}",
		"help": "帮助",
		"playerTimedOut": "玩家 {name} 已超时",
		"toKickoutPressConfirm": "要踢出 {name}，请按“确认踢出”",
		"allowMoreTimeReload": "否则您可以给 {name} 更多时间——刷新页面以重新发起踢出",
		"keepName": "保留 {name} 在游戏中——但结束其当前回合",
		"permanentlyRemove": "这将把 {name} 永久移出游戏",
		"cannotBeUndone": "此操作无法撤销",
		"checkChatAbsence": "请查看聊天记录，确认对方是否说明了暂时离开的原因",
		"gracePeriodNote": "请考虑给予对方短暂的宽限期，以防只是暂时延误",
		"permanentlyKickout": "永久踢出 {name}",
		"voteNeededKickout": "需要其他玩家投票才能踢出 {name}",
		"votesLine": "票数：{count}/{threshold}（{voters}）",
		"voteToKickout": "投票踢出 {name}",
		"youHaveVotedKickout": "你已投票踢出 {name}",
		"kickDirectlyIn": "如果其他玩家没有同样投票，你可以在 {countdown} 后直接踢出他们",
		"beach": "休假区",
		"ceoSlot": "CEO 槽位",
		"pizzaMilestone": "披萨里程碑",
		"ceoLabelRecruiting": "2倍：雇佣 1 人或减少 $5 工资",
		"coffeeMsUnlimitedRange": "“首次售出咖啡”里程碑允许你放置一家无限范围的咖啡店",
		"chooseItemsToUse": "选择您要使用的物品：|选择您要使用的 {count} 件物品：",
		"payRestInMoney": "用 $$$ 支付剩余部分",
		"moduleNames": {
			"999": "跳过模块"
		},
		"moduleDescs": {
			"8": "最先培训／最先推销的奖励在 2 回合后消失。最先雇佣 3 人的奖励在 3 回合后消失",
			"10": "房屋会优先选择带有其需求 + 泡菜的餐厅",
			"11": "带花园的房屋会尝试用寿司替代所有需求",
			"12": "面条可视为任意需求物品，但前提是其他人无法供应",
			"14": "决定回合顺序并打破平局",
			"15": "每位大众推销员重复一次营销阶段",
			"16": "必须放入管理槽位。所有无薪员工在 9-5 期间工作两次",
			"17": "向乡村地区推销——通过高速公路匝道进入",
			"19": "沿房屋行进的路线销售咖啡",
			"20": "里程碑：第一次有其他人卖出你的需求时，永久获得距离 -1",
			"23": "银行破产时，每位玩家增加 $200。基础价格变为 $5、$10 或 $20 中选择最多的一项"
		}
	},
	"FCM_IO": {
		"olderVersionDetected": "检测到旧版本。请刷新。"
	},
	"workingDay": {
		"clickToUndoTrain": "点击撤销此培训"
	},
	"history": {
		"animAnimate": "动画",
		"animStepThrough": "逐步播放",
		"animHouseLabel": "房屋 #{num}",
		"animApartmentLabel": "公寓 #{num}",
		"animRuralLabel": "乡村地区",
		"animDemandLeaves": "{building} 向 {player} 出售。",
		"animPickup": "{building} 出发前往 {player} 的餐厅。",
		"animDrive": "汽车驶向下一格道路。",
		"animCoffee": "汽车经过 {player} 的咖啡店——他们获得 +${amount}！",
		"animArrive": "{building} 到达 {player} 的餐厅。购买物品获得 +${income}！",
		"animRange": "当前范围：{range}",
		"animCost": "当前距离成本：${cost}",
		"animPrev": "上一步",
		"animNext": "下一步",
		"animStart": "开始",
		"animEnd": "结束",
		"animSwitchStep": "切换到逐步播放",
		"animClose": "关闭",
		"animStepOf": "{current} / {total}"
	}
}
