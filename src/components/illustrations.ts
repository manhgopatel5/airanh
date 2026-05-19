import empty from "@/assets/lotties/huha-empty.json";
import idle from "@/assets/lotties/huha-idle.json";
import loadingPull from "@/assets/lotties/huha-loading-pull.json";
import searching from "@/assets/lotties/huha-searching.json";
import noWifi from "@/assets/lotties/huha-no-wifi.json";
import errorShake from "@/assets/lotties/huha-error-shake.json";
import successCheck from "@/assets/lotties/huha-success-check.json";
import celebrate from "@/assets/lotties/huha-celebrate.json";
import coinDrop from "@/assets/lotties/huha-coin-drop.json";
import walletOpen from "@/assets/lotties/huha-wallet-open.json";
import switchToggle from "@/assets/lotties/huha-switch.json";
import task from "@/assets/lotties/huha-task.json";
import plan from "@/assets/lotties/huha-plan.json";

const illustrations = {
  empty: empty as any,
  idle: idle as any,
  loadingPull: loadingPull as any,
  searching: searching as any,
  noWifi: noWifi as any,
  errorShake: errorShake as any,
  successCheck: successCheck as any,
  celebrate: celebrate as any,
  coinDrop: coinDrop as any,
  walletOpen: walletOpen as any,
  switchToggle: switchToggle as any,
  task: task as any,
  plan: plan as any,
};

console.log("illustrations loaded", illustrations);

export default illustrations;

export {
  illustrations,
  empty,
  idle,
  loadingPull,
  searching,
  noWifi,
  errorShake,
  successCheck,
  celebrate,
  coinDrop,
  walletOpen,
  switchToggle,
  task,
  plan,
};