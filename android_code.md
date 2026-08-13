# Kode Sumber Native Android (Kotlin) - Math Alarm App

File ini berisi dokumentasi dan kode sumber lengkap untuk mengimplementasikan **Math Alarm** pada platform Android Native menggunakan **Kotlin**, `AlarmManager`, `BroadcastReceiver`, `MediaPlayer`, `RingtoneManager` (untuk memilih nada alarm sendiri / file MP3 kustom), dan `Activity` berlayar penuh (*Full-Screen Intent*).

---

## 📁 Structure Directory Android

```
app/src/main/
├── AndroidManifest.xml
└── java/com/example/mathalarm/
    ├── MainActivity.kt
    ├── AlarmReceiver.kt
    ├── RingingActivity.kt
    └── MathGenerator.kt
```

---

## 1. `AndroidManifest.xml`

Perizinan yang dibutuhkan untuk menjalankan alarm persis (*exact alarm*), membaca media eksternal (suara kustom), dan mengaktifkan layar.

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/app/android"
    package="com.example.mathalarm">

    <!-- Perizinan Alarm, Power, & Pembacaan File Musik -->
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.USE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />
    <uses-permission android:name="android.permission.DISABLE_KEYGUARD" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Math Alarm"
        android:theme="@style/Theme.MaterialComponents.DayNight.NoActionBar">

        <!-- Main Activity -->
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Ringing Screen Activity -->
        <activity
            android:name=".RingingActivity"
            android:showOnLockScreen="true"
            android:turnScreenOn="true"
            android:excludeFromRecents="true"
            android:exported="false" />

        <!-- Broadcast Receiver -->
        <receiver
            android:name=".AlarmReceiver"
            android:enabled="true"
            android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
        </receiver>

    </application>
</manifest>
```

---

## 2. `MainActivity.kt` (Memilih Suara Kustom & Menjadwalkan `AlarmManager`)

Main activity di mana pengguna dapat menentukan jam/menit alarm, serta **memilih lagu/nada alarm kustom** via `RingtoneManager` atau File Picker MP3.

```kotlin
package com.example.mathalarm

import android.app.Activity
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.TimePicker
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import java.util.Calendar

class MainActivity : AppCompatActivity() {

    private lateinit var timePicker: TimePicker
    private lateinit var btnSelectRingtone: Button
    private lateinit var tvSelectedRingtone: TextView
    private lateinit var btnSetAlarm: Button

    private var selectedRingtoneUri: Uri? = null

    // Register Activity Result Launcher untuk memilih Suara Alarm Kustom
    private val ringtonePickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val uri: Uri? = result.data?.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI)
            if (uri != null) {
                selectedRingtoneUri = uri
                val ringtone = RingtoneManager.getRingtone(this, uri)
                val title = ringtone.getTitle(this) ?: "Suara Kustom"
                tvSelectedRingtone.text = "Suara Terpilih: $title"
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        timePicker = findViewById(R.id.timePicker)
        btnSelectRingtone = findViewById(R.id.btnSelectRingtone)
        tvSelectedRingtone = findViewById(R.id.tvSelectedRingtone)
        btnSetAlarm = findViewById(R.id.btnSetAlarm)

        // Set Default Ringtone Alarm System
        selectedRingtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)

        // Tombol Pilih Nada / File Lagu Sendiri
        btnSelectRingtone.setOnClickListener {
            val intent = Intent(RingtoneManager.ACTION_RINGTONE_PICKER).apply {
                putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_ALARM)
                putExtra(RingtoneManager.EXTRA_RINGTONE_TITLE, "Pilih Nada/Suara Alarm Anda")
                putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI, selectedRingtoneUri)
                putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false)
                putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true)
            }
            ringtonePickerLauncher.launch(intent)
        }

        btnSetAlarm.setOnClickListener {
            val calendar = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, timePicker.hour)
                set(Calendar.MINUTE, timePicker.minute)
                set(Calendar.SECOND, 0)
            }

            if (calendar.timeInMillis <= System.currentTimeMillis()) {
                calendar.add(Calendar.DAY_OF_YEAR, 1)
            }

            setExactAlarm(calendar.timeInMillis)
        }
    }

    private fun setExactAlarm(timeInMillis: Long) {
        val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(this, AlarmReceiver::class.java).apply {
            putExtra("EXTRA_LABEL", "Bangun Pagi!")
            putExtra("EXTRA_DIFFICULTY", "medium")
            putExtra("EXTRA_RINGTONE_URI", selectedRingtoneUri?.toString())
        }

        val pendingIntent = PendingIntent.getBroadcast(
            this,
            1001,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                timeInMillis,
                pendingIntent
            )
        } else {
            alarmManager.setExact(
                AlarmManager.RTC_WAKEUP,
                timeInMillis,
                pendingIntent
            )
        }

        Toast.makeText(this, "Alarm berhasil disimpan!", Toast.LENGTH_SHORT).show()
    }
}
```

---

## 3. `AlarmReceiver.kt` (`BroadcastReceiver`)

```kotlin
package com.example.mathalarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val alarmLabel = intent.getStringExtra("EXTRA_LABEL") ?: "Bangun Pagi!"
        val difficulty = intent.getStringExtra("EXTRA_DIFFICULTY") ?: "medium"
        val ringtoneUri = intent.getStringExtra("EXTRA_RINGTONE_URI")

        val ringingIntent = Intent(context, RingingActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("EXTRA_LABEL", alarmLabel)
            putExtra("EXTRA_DIFFICULTY", difficulty)
            putExtra("EXTRA_RINGTONE_URI", ringtoneUri)
        }

        context.startActivity(ringingIntent)
    }
}
```

---

## 4. `RingingActivity.kt` (Memutar Suara Kustom & Memproses Soal Matematika)

```kotlin
package com.example.mathalarm

import android.app.KeyguardManager
import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity

class RingingActivity : AppCompatActivity() {

    private lateinit var mediaPlayer: MediaPlayer
    private lateinit var tvQuestion: TextView
    private lateinit var tvLabel: TextView
    private lateinit var etAnswer: EditText
    private lateinit var btnSubmit: Button

    private var currentProblem: MathProblem? = null
    private var difficulty: String = "medium"
    private var ringtoneUriStr: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        turnOnScreenAndUnlock()
        setContentView(R.layout.activity_ringing)

        tvLabel = findViewById(R.id.tvLabel)
        tvQuestion = findViewById(R.id.tvQuestion)
        etAnswer = findViewById(R.id.etAnswer)
        btnSubmit = findViewById(R.id.btnSubmit)

        val label = intent.getStringExtra("EXTRA_LABEL") ?: "Bangun Pagi!"
        difficulty = intent.getStringExtra("EXTRA_DIFFICULTY") ?: "medium"
        ringtoneUriStr = intent.getStringExtra("EXTRA_RINGTONE_URI")

        tvLabel.text = label

        // Membunyikan Suara Alarm Kustom / Default
        startAlarmSound()

        // Membuat Soal Matematika Acak
        newMathQuestion()

        btnSubmit.setOnClickListener {
            checkAnswer()
        }
    }

    private fun startAlarmSound() {
        val soundUri: Uri = if (!ringtoneUriStr.isNullOrEmpty()) {
            Uri.parse(ringtoneUriStr)
        } else {
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        }

        try {
            mediaPlayer = MediaPlayer().apply {
                setDataSource(applicationContext, soundUri)
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                isLooping = true // Suara alarm terus berbunyi!
                prepare()
                start()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun stopAlarmSound() {
        if (::mediaPlayer.isInitialized && mediaPlayer.isPlaying) {
            mediaPlayer.stop()
            mediaPlayer.release()
        }
    }

    private fun newMathQuestion() {
        currentProblem = MathGenerator.generateProblem(difficulty)
        tvQuestion.text = currentProblem?.questionText
        etAnswer.text.clear()
    }

    private fun checkAnswer() {
        val userInputStr = etAnswer.text.toString().trim()

        // ❌ Belum Menjawab -> Alarm tetap berbunyi
        if (userInputStr.isEmpty()) {
            Toast.makeText(this, "❌ Belum menjawab! Alarm tetap berbunyi.", Toast.LENGTH_SHORT).show()
            return
        }

        val userAnswer = userInputStr.toIntOrNull()

        // ❌ Jawaban Salah -> Soal baru muncul, alarm tetap berbunyi
        if (userAnswer != currentProblem?.answer) {
            Toast.makeText(this, "❌ Jawaban salah! Soal baru muncul, alarm tetap berbunyi.", Toast.LENGTH_SHORT).show()
            newMathQuestion()
            return
        }

        // ✅ Jawaban Benar -> Matikan alarm & Tampilkan berhasil
        stopAlarmSound()

        AlertDialog.Builder(this)
            .setTitle("🎉 MISSION SELESAI!")
            .setMessage("Selamat pagi!\nOtak Anda telah aktif dan alarm dimatikan.")
            .setCancelable(false)
            .setPositiveButton("Mulai Hari Ini") { dialog, _ ->
                dialog.dismiss()
                finish()
            }
            .show()
    }

    private fun turnOnScreenAndUnlock() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        } else {
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        stopAlarmSound()
    }
}
```
