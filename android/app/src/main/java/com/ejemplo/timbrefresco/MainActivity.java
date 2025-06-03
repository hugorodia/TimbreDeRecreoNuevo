package com.ejemplo.timbrefresco;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.content.Context;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Crear canal de notificación
    createNotificationChannel();
  }

  private void createNotificationChannel() {
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
      NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
      String channelId = "timbre_channel";
      String channelName = "Timbre de Recreo";
      NotificationChannel channel = new NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_HIGH);
      channel.enableVibration(true);
      channel.setSound(Uri.parse("android.resource://" + getPackageName() + "/raw/timbre"),
                      new AudioAttributes.Builder()
                          .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                          .build());
      notificationManager.createNotificationChannel(channel);
    }
  }
}
