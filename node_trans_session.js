//
//  Created by Mingliang Chen on 18/3/9.
//  illuspas[a]gmail.com
//  Copyright (c) 2018 Nodemedia. All rights reserved.
//

const EventEmitter = require('events');
const { spawn } = require('child_process');
const dateFormat = require('dateformat');
const mkdirp = require('mkdirp');
const fs = require('fs');

class NodeTransSession extends EventEmitter {
  constructor(conf) {
    super();
    this.conf = conf;
  }

  run() {
    let vc = 'copy';
    let ac = this.conf.args.ac == 10 ? 'copy' : this.conf.ac ? this.conf.ac : 'aac';
    let inPath = 'rtmp://localhost:' + this.conf.port + this.conf.streamPath;
    let ouPath = `${this.conf.mediaroot}/${this.conf.app}/${this.conf.stream}`;
    let mapStr = '';
    if (this.conf.mp4) {
      this.conf.mp4Flags = this.conf.mp4Flags ? this.conf.mp4Flags : '';
      let now = new Date();
      let mp4FileName = dateFormat('yyyy-mm-dd-HH-MM') + '.mp4';
      let mapMp4 = `${this.conf.mp4Flags}${ouPath}/${mp4FileName}|`;
      mapStr += mapMp4;
      console.log('[Transmuxing MP4] ' + this.conf.streamPath + ' to ' + ouPath + '/' + mp4FileName);
    }
    if (this.conf.hls) {
      this.conf.hlsFlags = this.conf.hlsFlags ? this.conf.hlsFlags : '';
      let hlsFileName = 'index.m3u8';
      let mapHls = `${this.conf.hlsFlags}${ouPath}/${hlsFileName}|`;
      mapStr += mapHls;
      console.log('[Transmuxing HLS] ' + this.conf.streamPath + ' to ' + ouPath + '/' + hlsFileName);
    }
    if (this.conf.dash) {
      this.conf.dashFlags = this.conf.dashFlags ? this.conf.dashFlags : '';
      let dashFileName = 'index.mpd';
      let mapDash = `${this.conf.dashFlags}${ouPath}/${dashFileName}`;
      mapStr += mapDash;
      console.log('[Transmuxing DASH] ' + this.conf.streamPath + ' to ' + ouPath + '/' + dashFileName);
    }
    mkdirp(ouPath);
    let argv = ['-y', '-analyzeduration', '1000000', '-i', inPath, '-c:v', vc, '-c:a', ac, '-f', 'tee', '-map', '0:a?', '-map', '0:v?', mapStr];
    // console.log(argv.toString());
    this.ffmpeg_exec = spawn(this.conf.ffmpeg, argv);
    this.ffmpeg_exec.on('error', (e) => {
      // console.log(e);
    });

    this.ffmpeg_exec.stdout.on('data', (data) => {
      // console.log(`输出：${data}`);
    });

    this.ffmpeg_exec.stderr.on('data', (data) => {
      // console.log(`错误：${data}`);
    });

    this.ffmpeg_exec.on('close', (code) => {
      console.log('[Transmuxing end] ' + this.conf.streamPath);
      this.emit('end');
      fs.readdir(ouPath, function (err, files) {
        if (!err) {
          files.forEach((filename) => {
            if (filename.endsWith('.ts')
              || filename.endsWith('.m3u8')
              || filename.endsWith('.mpd')
              || filename.endsWith('.m4s')) {
              fs.unlinkSync(ouPath + '/' + filename);
            }
          })
        }
      });
    });
  }

  end() {
    // this.ffmpeg_exec.kill('SIGINT');
    this.ffmpeg_exec.stdin.write('q');
  }
}

module.exports = NodeTransSession;