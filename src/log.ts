import fs from "fs";

class Log {
  static lastDate: string;
  static debugMode = false;

  static write(message: string, props: { error?: boolean; debug?: boolean }): void {
    const d = new Date();
    const today = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    if (this.lastDate && today !== this.lastDate && fs.existsSync("log.txt")) {
      fs.renameSync("log.txt", `log-${this.lastDate}.txt`);
      this.lastDate = today;
    }

    let type = "INFO  - ";
    if (props.debug) type = "DEBUG - ";
    else if (props.error) type = "ERROR - ";

    const msg = `[${d.toISOString()}] ${type} ${message}`;
    if ((this.debugMode && props.debug) || !props.debug) {
      // eslint-disable-next-line no-console
      console.log(msg);
    }
    // Always log to file
    fs.appendFile("log.txt", `${msg}\n`, () => {});
  }

  static debug(message: string): void {
    Log.write(message, { debug: true });
  }

  static info(message: string): void {
    Log.write(message, {});
  }

  static error(message: string): void {
    Log.write(message, { error: true });
  }
}

export default Log;
