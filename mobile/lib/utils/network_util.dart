import "package:connectivity_plus/connectivity_plus.dart";
import "package:flutter/foundation.dart" show debugPrint;
import "package:photos/core/configuration.dart";

Future<bool> canUseHighBandwidth() async {
  // Connections will contain a list of currently active connections.
  // could be vpn and wifi or mobile and vpn, but should not be wifi and mobile
  final List<ConnectivityResult> connections =
      await (Connectivity().checkConnectivity());
  bool canUploadUnderCurrentNetworkConditions = true;
  if (!Configuration.instance.shouldBackupOverMobileData()) {
    if (connections.any((element) => element == ConnectivityResult.mobile)) {
      canUploadUnderCurrentNetworkConditions = false;
    } else {
      debugPrint(
        "[canUseHighBandwidth] mobileBackupDisabled, backing up with connections: ${connections.map((e) => e.name).toString()}",
      );
    }
  }
  return canUploadUnderCurrentNetworkConditions;
}
